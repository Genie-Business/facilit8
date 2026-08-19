import { randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";
import type { AdminTier } from "@/lib/generated/prisma/client";

interface AdminResult {
  success: boolean;
  error?: string;
}

export async function listAdmins() {
  return prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, firstName: true, lastName: true, email: true, adminTier: true, deactivatedAt: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Creates a new admin with a throwaway random password hash — never exposed to anyone,
 * not even the Super Admin creating the account. The new admin sets their own real
 * password via the normal /forgot-password flow, exactly like the first admin account
 * on this project was bootstrapped.
 */
export async function createAdmin(input: {
  email: string;
  firstName: string;
  lastName: string;
  tier: AdminTier;
}): Promise<AdminResult> {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) return { success: false, error: "A user with this email already exists." };

  const throwawayPassword = randomBytes(48).toString("hex");
  const passwordHash = await bcrypt.hash(throwawayPassword, 12);
  const slug = await generateUniqueSlug(
    `${input.firstName}-${input.lastName}`,
    async (candidate) => (await prisma.user.findUnique({ where: { slug: candidate } })) !== null
  );

  await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      role: "ADMIN",
      adminTier: input.tier,
      firstName: input.firstName,
      lastName: input.lastName,
      slug,
      mobilePhone: `admin-${Date.now()}-${randomBytes(3).toString("hex")}`, // placeholder, unique — admins have no wallet/SMS use for this field
    },
  });

  return { success: true };
}

/** Won't demote the last remaining SUPER_ADMIN — would lock everyone out of admin-management/billing. */
export async function updateAdminTier(userId: string, tier: AdminTier): Promise<AdminResult> {
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.role !== "ADMIN") return { success: false, error: "Admin not found." };

  if (target.adminTier === "SUPER_ADMIN" && tier !== "SUPER_ADMIN") {
    const otherSuperAdmins = await prisma.user.count({
      where: { role: "ADMIN", adminTier: "SUPER_ADMIN", id: { not: userId } },
    });
    if (otherSuperAdmins === 0) {
      return { success: false, error: "Can't demote the last Super Admin." };
    }
  }

  await prisma.user.update({ where: { id: userId }, data: { adminTier: tier } });
  return { success: true };
}
