import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth.config";
import { siteUrl, appUrl } from "@/lib/site";

// Deliberately built on the edge-safe authConfig (no Prisma/bcrypt) rather than the full
// lib/auth.ts — this file runs in the Edge runtime and Prisma's generated client pulls in
// Node-only built-ins that Edge can't load. See lib/auth.config.ts for why.
const { auth } = NextAuth(authConfig);

const ADMIN_PREFIX = "/admin";

// Top-level (app)-group prefixes — only servable from the app subdomain. Keep in sync with
// the routes actually inside app/(app)/.
const APP_PATH_PREFIXES = [
  "/dashboard",
  "/profile",
  "/settings",
  "/wallet",
  "/events",
  "/my-events",
  "/applications",
  "/facilitators",
  "/notifications",
  "/calendar",
  "/search",
  "/chat",
  "/awe",
  "/merged-trainings",
  "/organization",
  "/onboarding",
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const APP_HOSTNAME = new URL(appUrl).hostname; // "app.localhost" | "app.usefacilit8.training"

// "localhost" sits on the Public Suffix List (browsers treat it as its own registrable
// domain specifically to stop one local dev server's subdomain from sharing cookies with
// another), so a session cookie set on the apex localhost:3000 is never sent to
// app.localhost:3000 — sign-in would always bounce back to /login. Real domains
// (*.usefacilit8.training) aren't on the PSL and don't have this problem. When
// NEXT_PUBLIC_SITE_URL and NEXT_PUBLIC_APP_URL are configured to the same host (the
// recommended local-dev setup), skip the cross-host dance entirely and gate access on
// this one host instead.
const SINGLE_HOST_MODE = APP_HOSTNAME === new URL(siteUrl).hostname;

// Auth pages aren't covered by APP_PATH_PREFIXES/ADMIN_PREFIX (they're their own route
// group), but need the same strict treatment as the authenticated app — they collect
// credentials, PII, and bank details. (auth)/layout.tsx forces all four dynamic for exactly
// this reason (see the comment there).
const AUTH_PATH_PREFIXES = ["/login", "/signup", "/forgot-password", "/reset-password"];

// Whether a request needs the strict, nonce'd script-src. Next.js can only thread a fresh
// per-request nonce onto its own <script> tags when the route is actually dynamically
// rendered — a statically-optimized page's HTML (including its script tags) is generated
// once at build time and reused for every visitor, so there's no way to bake in a
// genuinely-per-request value. Applying the nonce'd policy to a page that stays static
// doesn't fail gracefully: every script tag ships with no nonce at all and the browser
// blocks all of them outright, breaking hydration site-wide (confirmed against a real
// local production build before this was scoped down to just these prefixes). The
// marketing/public pages are deliberately left static for caching/performance, so they get
// a simpler 'self'-only script-src instead — solid protection against the primary XSS
// vector (externally injected <script src> tags), just without strict-dynamic's stronger
// guarantee against an inline-script payload.
function needsStrictCsp(pathname: string): boolean {
  return (
    matchesPrefix(pathname, APP_PATH_PREFIXES) ||
    pathname.startsWith(ADMIN_PREFIX) ||
    matchesPrefix(pathname, AUTH_PATH_PREFIXES)
  );
}

// connect-src is scoped to same-origin plus the three hosts the client actually talks to:
// Pusher (wss + the sockjs/stats https fallback hosts, all *.pusher.com) and Vercel Blob
// (the client-upload flow PUTs bytes directly from the browser to the per-store
// *.public.blob.vercel-storage.com host, bypassing the server — same host reads already
// use). Kept identical for both strict and simple pages rather than adding a second split —
// it's not meaningfully more permissive for pages that don't use either.
function buildCsp(nonce: string, strict: boolean): string {
  // React's dev-mode debugging tooling (Fast Refresh stack reconstruction, etc.) calls
  // eval() for various instrumentation — never happens in production builds (React's own
  // guarantee), so 'unsafe-eval' is scoped to non-production only and never ships live.
  const devOnly = process.env.NODE_ENV !== "production" ? " 'unsafe-eval'" : "";
  // 'self' alone blocks ALL inline <script> content, nonce or not — and Next renders its own
  // bootstrap/hydration data as inline scripts on every page, static ones included. A static
  // page can't carry a per-request nonce (see needsStrictCsp), and hardcoding content hashes
  // would break on the next `next build` the instant Next's own bootstrap script content
  // shifts by a byte. 'unsafe-inline' is the standard fallback for pages that can't use
  // nonces — 'self' still restricts <script src> to same-origin, so this still blocks the
  // primary threat (an attacker's externally-hosted payload script loading at all); it only
  // gives up protection against an inline-script payload, which requires a much harder-to-
  // pull-off injection into the static page's own rendered HTML in the first place.
  const scriptSrc = strict
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${devOnly}`
    : `script-src 'self' 'unsafe-inline'${devOnly}`;
  return [
    scriptSrc,
    "connect-src 'self' wss://*.pusher.com https://*.pusher.com https://*.public.blob.vercel-storage.com",
    "frame-ancestors 'none'",
  ].join("; ");
}

function applySecurityHeaders(response: NextResponse, csp: string): NextResponse {
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

// Next's edge middleware adapter rebuilds a redirect's NextURL using the *current request's*
// Host header (next/dist/server/web/adapter.js), then collapses the Location header to a
// relative path whenever it thinks the target host matches the request host — which, after
// that rebuild, it always does, even when we deliberately redirect to a different hostname.
// The browser then resolves that relative path against whatever host it's currently on,
// producing a same-host bounce instead of the cross-host one we asked for (visible as an
// infinite redirect loop between the two hosts). A real 3xx/Location header is fundamentally
// unable to express "go to a different host" here, so cross-host hops use a plain 200 HTML
// response with a client-side redirect instead — no Location header, no rewriting. Its own
// inline <script> needs the same request's nonce or a strict script-src blocks it too.
function crossHostRedirect(url: string | URL, nonce: string): NextResponse {
  const target = url.toString();
  return new NextResponse(
    `<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${target}"></head>` +
      `<body><script nonce="${nonce}">location.replace(${JSON.stringify(target)});</script></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const session = req.auth;

  // Web Crypto API, not node:crypto — this file runs in the Edge runtime.
  const nonce = btoa(crypto.randomUUID());
  // Redirects (NextResponse.redirect, crossHostRedirect) never render page content, so
  // strict-vs-simple doesn't matter for them — crossHostRedirect's own tiny inline script
  // always needs *a* nonce to run, so those always get the strict/nonce'd variant.
  const strictCsp = buildCsp(nonce, true);
  const withHeaders = (response: NextResponse, csp: string = strictCsp) =>
    applySecurityHeaders(response, csp);

  // Next reads the nonce back off this same request's headers to apply it to any Server
  // Component that wants it (none currently do, via requestHeaders below), and reads it off
  // the *response's* Content-Security-Policy header to nonce its own rendered <script> tags
  // — but only takes effect on routes that are actually dynamically rendered; see
  // needsStrictCsp for why.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  const next = () => {
    const csp = buildCsp(nonce, needsStrictCsp(pathname));
    return withHeaders(NextResponse.next({ request: { headers: requestHeaders } }), csp);
  };

  if (SINGLE_HOST_MODE) {
    if (matchesPrefix(pathname, APP_PATH_PREFIXES) && !session) {
      const loginUrl = new URL("/login", siteUrl);
      loginUrl.searchParams.set("callbackUrl", pathname + search);
      return withHeaders(NextResponse.redirect(loginUrl));
    }
    if (pathname.startsWith(ADMIN_PREFIX)) {
      if (!session) {
        const loginUrl = new URL("/login", siteUrl);
        loginUrl.searchParams.set("callbackUrl", pathname + search);
        return withHeaders(NextResponse.redirect(loginUrl));
      }
      if (session.user.role !== "ADMIN") {
        return withHeaders(NextResponse.redirect(new URL("/dashboard", siteUrl)));
      }
    }
    return next();
  }

  // Read hostname straight off the Host header — next-auth's auth() wrapper rebuilds req/
  // req.nextUrl from NEXTAUTH_URL (see reqWithEnvURL in next-auth/lib/env.js) before handing
  // the request to this handler, so req.nextUrl.hostname is always the apex, never reliable
  // for detecting which host actually served the request.
  const hostname = (req.headers.get("host") ?? req.nextUrl.hostname).split(":")[0];
  const onAppHost = hostname === APP_HOSTNAME;

  if (onAppHost) {
    // app.<domain> serves ONLY (app)-group paths — checked before the auth check so /,
    // /login, /about etc. hit on this host never trigger a login redirect here; they just
    // bounce straight to their real home on the apex.
    if (!matchesPrefix(pathname, APP_PATH_PREFIXES)) {
      return withHeaders(crossHostRedirect(new URL(`${pathname}${search}`, siteUrl), nonce));
    }
    if (!session) {
      const loginUrl = new URL("/login", siteUrl);
      // Absolute — baseUrl in the NextAuth redirect callback is always the apex origin
      // (see lib/auth.config.ts), so a bare relative path here would resolve against
      // apex after login instead of this (app) subdomain.
      loginUrl.searchParams.set("callbackUrl", `${appUrl}${pathname}${search}`);
      return withHeaders(crossHostRedirect(loginUrl, nonce));
    }
    return next();
  }

  // Apex (and any unrecognized host, e.g. a *.vercel.app preview — treated as apex-like).
  if (matchesPrefix(pathname, APP_PATH_PREFIXES)) {
    return withHeaders(crossHostRedirect(new URL(`${pathname}${search}`, appUrl), nonce));
  }

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!session) {
      const loginUrl = new URL("/login", siteUrl);
      loginUrl.searchParams.set("callbackUrl", pathname + search); // same-host — admin + login both live on apex
      return withHeaders(NextResponse.redirect(loginUrl));
    }
    if (session.user.role !== "ADMIN") {
      return withHeaders(crossHostRedirect(new URL(`${appUrl}/dashboard`), nonce));
    }
  }

  return next();
});

// Broadened from the old path-allowlist matcher: the handler now also needs to catch apex
// hits on (app) paths and app-host hits on non-(app) paths, not just admin/(app) routes —
// so it runs on everything except API routes, Next internals, and static assets.
export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|.*\\..*).*)"],
};
