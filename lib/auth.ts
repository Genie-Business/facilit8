import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/db";
import { authConfig } from "@/lib/auth.config";
import { loginSchema } from "@/lib/validation/auth";
import { isRateLimited, RATE_LIMITS } from "@/lib/rate-limit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Keyed by email, not just IP: this is the layer that also protects the raw
        // /api/auth/callback/credentials endpoint, which bypasses loginAction's own
        // IP-based check entirely. Email-keyed defends against distributed/rotating-IP
        // attempts against one account that an IP-only limit wouldn't catch.
        const email = parsed.data.email.toLowerCase();
        if (await isRateLimited("login-email", RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs, email)) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user) return null;

        const passwordValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!passwordValid) return null;

        // loginAction checks deactivatedAt itself first and offers a reactivation prompt
        // before ever calling signIn() — but the raw /api/auth/callback/credentials endpoint
        // bypasses loginAction entirely (same bypass the rate limiter above guards against),
        // so this is the backstop: a deactivated account can never complete sign-in through
        // any path except the explicit reactivateAccountAction flow, which clears
        // deactivatedAt before calling signIn().
        if (user.deactivatedAt) return null;

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          slug: user.slug,
          adminTier: user.adminTier,
        };
      },
    }),
  ],
});
