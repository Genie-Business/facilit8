"use server";

import { revalidatePath } from "next/cache";

import { cancelAweSubscription, undoAweSubscriptionCancellation } from "@/lib/services/awe-subscription.service";
import { requireSuperAdmin } from "@/lib/auth/admin-guard";

export async function cancelAweSubscriptionAction(userId: string): Promise<void> {
  await requireSuperAdmin();
  await cancelAweSubscription(userId);
  revalidatePath("/admin/awe-subscriptions");
}

export async function undoAweSubscriptionCancellationAction(userId: string): Promise<void> {
  await requireSuperAdmin();
  await undoAweSubscriptionCancellation(userId);
  revalidatePath("/admin/awe-subscriptions");
}
