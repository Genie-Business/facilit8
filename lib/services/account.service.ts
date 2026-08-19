import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { deactivateUser } from "@/lib/services/user-status.service";

interface DeactivateResult {
  success: boolean;
  error?: string;
}

/** Mirrors withdrawFunds's password re-confirmation pattern — a deliberate, confirmed action. */
export async function deactivateOwnAccount(userId: string, password: string): Promise<DeactivateResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found." };

  const passwordValid = await bcrypt.compare(password, user.passwordHash);
  if (!passwordValid) return { success: false, error: "Incorrect password." };

  await deactivateUser(userId);
  return { success: true };
}
