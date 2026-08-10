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
];

function matchesPrefix(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

const APP_HOSTNAME = new URL(appUrl).hostname; // "app.localhost" | "app.usefacilit8.training"

// Next's edge middleware adapter rebuilds a redirect's NextURL using the *current request's*
// Host header (next/dist/server/web/adapter.js), then collapses the Location header to a
// relative path whenever it thinks the target host matches the request host — which, after
// that rebuild, it always does, even when we deliberately redirect to a different hostname.
// The browser then resolves that relative path against whatever host it's currently on,
// producing a same-host bounce instead of the cross-host one we asked for (visible as an
// infinite redirect loop between the two hosts). A real 3xx/Location header is fundamentally
// unable to express "go to a different host" here, so cross-host hops use a plain 200 HTML
// response with a client-side redirect instead — no Location header, no rewriting.
function crossHostRedirect(url: string | URL): NextResponse {
  const target = url.toString();
  return new NextResponse(
    `<!doctype html><html><head><meta http-equiv="refresh" content="0;url=${target}"></head>` +
      `<body><script>location.replace(${JSON.stringify(target)});</script></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const session = req.auth;
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
      return crossHostRedirect(new URL(`${pathname}${search}`, siteUrl));
    }
    if (!session) {
      const loginUrl = new URL("/login", siteUrl);
      // Absolute — baseUrl in the NextAuth redirect callback is always the apex origin
      // (see lib/auth.config.ts), so a bare relative path here would resolve against
      // apex after login instead of this (app) subdomain.
      loginUrl.searchParams.set("callbackUrl", `${appUrl}${pathname}${search}`);
      return crossHostRedirect(loginUrl);
    }
    return NextResponse.next();
  }

  // Apex (and any unrecognized host, e.g. a *.vercel.app preview — treated as apex-like).
  if (matchesPrefix(pathname, APP_PATH_PREFIXES)) {
    return crossHostRedirect(new URL(`${pathname}${search}`, appUrl));
  }

  if (pathname.startsWith(ADMIN_PREFIX)) {
    if (!session) {
      const loginUrl = new URL("/login", siteUrl);
      loginUrl.searchParams.set("callbackUrl", pathname + search); // same-host — admin + login both live on apex
      return NextResponse.redirect(loginUrl);
    }
    if (session.user.role !== "ADMIN") {
      return crossHostRedirect(new URL(`${appUrl}/dashboard`));
    }
  }

  return NextResponse.next();
});

// Broadened from the old path-allowlist matcher: the handler now also needs to catch apex
// hits on (app) paths and app-host hits on non-(app) paths, not just admin/(app) routes —
// so it runs on everything except API routes, Next internals, and static assets.
export const config = {
  matcher: ["/((?!api/|_next/static|_next/image|.*\\..*).*)"],
};
