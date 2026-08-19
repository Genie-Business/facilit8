import type { Role, AdminTier } from "@/lib/generated/prisma/client";
import type { DefaultSession } from "@auth/core/types";

// next-auth v5's own `next-auth` / `next-auth/jwt` entry points just re-export types
// from @auth/core (`export type { Session, ... } from "@auth/core/types"`), which means
// declaration merging has to target @auth/core directly — augmenting "next-auth"/"next-auth/jwt"
// silently does nothing.
declare module "@auth/core/types" {
  interface User {
    role: Role;
    slug: string;
    adminTier: AdminTier | null;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      slug: string;
      adminTier: AdminTier | null;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    userId: string;
    role: Role;
    slug: string;
    adminTier: AdminTier | null;
  }
}
