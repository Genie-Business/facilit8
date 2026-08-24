"use server";

import { revalidatePath } from "next/cache";

import { sendRecoveryEmail, listUsersNeedingRecovery } from "@/lib/services/account-recovery.service";
import { linkExistingAnchorCustomer, syncWalletFromAnchor } from "@/lib/services/anchor-reconciliation.service";
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

// Both actions below touch Anchor customer linkage / wallet data directly, using the
// server's own ANCHOR_SECRET_KEY — the admin never sees or enters a secret themselves.
// Gated to Super Admin only, matching the same bar as the other financially-sensitive admin
// pages (Awé Pricing, Platform Fees), since this is a step above the read-only recovery list.

export async function linkAnchorCustomerAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSuperAdmin();

  const userId = formData.get("userId");
  const anchorCustomerId = formData.get("anchorCustomerId");
  if (typeof userId !== "string" || !userId) return { error: "Missing user." };
  if (typeof anchorCustomerId !== "string" || !anchorCustomerId.trim()) {
    return { fieldErrors: { anchorCustomerId: "Enter the Anchor customer ID." } };
  }

  const result = await linkExistingAnchorCustomer(userId, anchorCustomerId.trim());
  if (!result.success) return { error: result.error };

  revalidatePath("/admin/account-recovery");
  return { success: "Linked. Provisioning can now continue normally." };
}

export async function syncWalletAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSuperAdmin();

  const userId = formData.get("userId");
  if (typeof userId !== "string" || !userId) return { error: "Missing user." };

  const result = await syncWalletFromAnchor(userId);
  if (!result.success) return { error: result.error };

  revalidatePath("/admin/account-recovery");
  return { success: "Wallet synced from Anchor." };
}
