import { prisma } from "@/lib/db";

/** Soft-deactivate: blocks login, data stays. Shared by self-service, admin-management, and login-time reactivation. */
export async function deactivateUser(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { deactivatedAt: new Date() } });
}

export async function reactivateUser(userId: string): Promise<void> {
  await prisma.user.update({ where: { id: userId }, data: { deactivatedAt: null } });
}
