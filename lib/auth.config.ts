import type { NextAuthConfig } from "next-auth";

import { siteUrl, appUrl } from "@/lib/site";

// Edge-safe half of the NextAuth config: no Prisma/bcrypt imports here, so this can be
// used from middleware/proxy (which runs in the Edge runtime) without pulling in Node-only
// APIs. The Credentials provider (which needs Prisma + bcrypt) is added on top of this in
// lib/auth.ts, which is only ever imported from route handlers / server components (Node runtime).

// VERCEL_ENV (not NODE_ENV) distinguishes real production from Vercel preview builds —
// NODE_ENV is "production" for previews too, and a Set-Cookie with a fixed apex Domain is
// silently rejected by the browser on a *.vercel.app preview host. On preview/unknown envs,
// cookieDomain stays undefined -> default host-only cookie (safe; a preview only exposes one
// host anyway, so cross-host sharing isn't needed there).
function resolveCookieDomain(): string | undefined {
  if (process.env.VERCEL_ENV === "production") return ".usefacilit8.training";
  if (process.env.NODE_ENV === "development") return "localhost";
  return undefined;
}
const cookieDomain = resolveCookieDomain();

export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 3, // 3h — matches the old Django SESSION_COOKIE_AGE
  },
  pages: {
    signIn: "/login",
  },
  // Vercel sets this implicitly via VERCEL=1, but pin it explicitly so behavior doesn't
  // silently change under `next start` without that var set.
  trustHost: true,
  providers: [],
  ...(cookieDomain ? { cookies: { sessionToken: { options: { domain: cookieDomain } } } } : {}),
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string;
        token.role = user.role;
        token.slug = user.slug;
        token.adminTier = user.adminTier;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.userId;
      session.user.role = token.role;
      session.user.slug = token.slug;
      session.user.adminTier = token.adminTier;
      return session;
    },
    // Default Auth.js redirect() only allows same-origin-as-baseUrl targets, and baseUrl is
    // always the apex origin (from NEXTAUTH_URL) regardless of which host called
    // signIn()/signOut(). Explicitly allow both known origins (apex + app subdomain);
    // anything else falls back to baseUrl (open-redirect protection).
    redirect({ url, baseUrl }) {
      const allowedOrigins = new Set([siteUrl, appUrl].map((u) => new URL(u).origin));
      try {
        const target = new URL(url, baseUrl);
        if (allowedOrigins.has(target.origin)) return target.toString();
      } catch {
        // fall through to the safe default below
      }
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      return baseUrl;
    },
  },
} satisfies NextAuthConfig;
