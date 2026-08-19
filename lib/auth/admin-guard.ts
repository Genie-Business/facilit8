import { auth } from "@/lib/auth";

/** Any admin — Super or Support tier. Throws (never redirects) since these are Server Actions. */
export async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Not authorized.");
  return session;
}

/** Super Admin only — billing/pricing and admin-management actions. */
export async function requireSuperAdmin() {
  const session = await requireAdmin();
  if (session.user.adminTier !== "SUPER_ADMIN") throw new Error("Not authorized.");
  return session;
}
