"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { raiseDispute } from "@/lib/services/dispute.service";
import { raiseDisputeSchema } from "@/lib/validation/dispute";
import { ActionState } from "@/lib/actions/shared";

export async function raiseDisputeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };

  const parsed = raiseDisputeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your input." };
  }

  const result = await raiseDispute({ ...parsed.data, raisedById: session.user.id });
  if (!result.success) return { error: result.error };

  const revalidateSlug = formData.get("revalidateSlug");
  if (typeof revalidateSlug === "string" && revalidateSlug) {
    const path = parsed.data.targetType === "TRAINING_EVENT" ? `/events/${revalidateSlug}` : `/merged-trainings/${revalidateSlug}`;
    revalidatePath(path);
  }

  return { success: "Dispute submitted. Facilit8 support will review it." };
}
