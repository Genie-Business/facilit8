"use server";

import { revalidatePath } from "next/cache";

import { markDisputeUnderReview, resolveDispute } from "@/lib/services/dispute.service";
import { resolveDisputeSchema } from "@/lib/validation/dispute";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";
import { requireAdmin } from "@/lib/auth/admin-guard";

export async function markDisputeUnderReviewAction(disputeId: string): Promise<void> {
  await requireAdmin();
  await markDisputeUnderReview(disputeId);
  revalidatePath("/admin/disputes");
}

export async function resolveDisputeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();

  const parsed = resolveDisputeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const result = await resolveDispute({ ...parsed.data, resolvedById: session.user.id });
  if (!result.success) return { error: result.error };

  revalidatePath("/admin/disputes");
  return { success: "Dispute resolved." };
}
