import type { NextAuthConfig } from "next-auth";

// Edge-safe half of the NextAuth config: no Prisma/bcrypt imports here, so this can be
// used from middleware/proxy (which runs in the Edge runtime) without pulling in Node-only
// APIs. The Credentials provider (which needs Prisma + bcrypt) is added on top of this in
// lib/auth.ts, which is only ever imported from route handlers / server components (Node runtime).
export const authConfig = {
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 3, // 3h — matches the old Django SESSION_COOKIE_AGE
  },
  pages: {
    signIn: "/login",
  },
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id as string;
        token.role = user.role;
        token.slug = user.slug;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.userId;
      session.user.role = token.role;
      session.user.slug = token.slug;
      return session;
    },
  },
} satisfies NextAuthConfig;
