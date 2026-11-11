"use server";

import { revalidatePath } from "next/cache";

import { sendRecoveryEmail, listUsersNeedingRecovery } from "@/lib/services/account-recovery.service";
import { resyncWallet } from "@/lib/services/wallet-reconciliation.service";
import { ActionState } from "@/lib/actions/shared";
import { requireAdmin, requireSuperAdmin } from "@/lib/auth/admin-guard";

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

// Re-runs wallet setup for one user using the server's own PAYSTACK_SECRET_KEY — the admin never sees
// or enters a secret themselves. Super Admin only, matching the other financially-sensitive admin
// tools (Awé Pricing, Platform Fees).
export async function resyncWalletAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSuperAdmin();

  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) return { error: "Missing user." };

  const result = await resyncWallet(userId);
  if (!result.success) return { error: result.error };

  revalidatePath("/admin/account-recovery");
  return { success: "Wallet setup re-run: everything that can be created now exists." };
}
