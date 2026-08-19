"use server";

import { revalidatePath } from "next/cache";

import { sendRecoveryEmail, listUsersNeedingRecovery } from "@/lib/services/account-recovery.service";
import { requireAdmin } from "@/lib/auth/admin-guard";

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
