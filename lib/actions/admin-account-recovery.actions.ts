"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { sendRecoveryEmail, listUsersNeedingRecovery } from "@/lib/services/account-recovery.service";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Not authorized.");
}

export async function sendRecoveryEmailAction(userId: string): Promise<void> {
  await requireAdmin();
  await sendRecoveryEmail(userId);
  revalidatePath("/admin/account-recovery");
}

export async function sendAllRecoveryEmailsAction(): Promise<void> {
  await requireAdmin();
  const users = await listUsersNeedingRecovery();
  for (const user of users) {
    await sendRecoveryEmail(user.id);
  }
  revalidatePath("/admin/account-recovery");
}
