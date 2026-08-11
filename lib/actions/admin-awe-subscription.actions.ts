"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { cancelAweSubscription, undoAweSubscriptionCancellation } from "@/lib/services/awe-subscription.service";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Not authorized.");
}

export async function cancelAweSubscriptionAction(userId: string): Promise<void> {
  await requireAdmin();
  await cancelAweSubscription(userId);
  revalidatePath("/admin/awe-subscriptions");
}

export async function undoAweSubscriptionCancellationAction(userId: string): Promise<void> {
  await requireAdmin();
  await undoAweSubscriptionCancellation(userId);
  revalidatePath("/admin/awe-subscriptions");
}
