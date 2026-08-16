"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { siteUrl } from "@/lib/site";
import { addMilestone, deleteMilestone } from "@/lib/services/milestone.service";
import { payFacilitatorForMilestone } from "@/lib/services/payout.service";
import { addMilestoneSchema } from "@/lib/validation/milestone";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";

export async function addMilestoneAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "You must be signed in." };

  const parsed = addMilestoneSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const result = await addMilestone({ ...parsed.data, requesterId: session.user.id });
  if (!result.success) return { error: result.error };

  const eventSlug = formData.get("eventSlug");
  if (typeof eventSlug === "string" && eventSlug) revalidatePath(`/events/${eventSlug}`);

  return { success: "Milestone added." };
}

export async function deleteMilestoneAction(milestoneId: string, eventSlug: string): Promise<void> {
  const session = await auth();
  if (!session) redirect(`${siteUrl}/login`);

  await deleteMilestone(milestoneId, session.user.id);
  revalidatePath(`/events/${eventSlug}`);
}

export async function payMilestoneAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) redirect(`${siteUrl}/login`);

  const milestoneId = formData.get("milestoneId");
  const eventSlug = formData.get("eventSlug");
  if (typeof milestoneId !== "string" || typeof eventSlug !== "string" || !milestoneId || !eventSlug) {
    redirect("/events");
  }

  await payFacilitatorForMilestone(milestoneId, session.user.id);

  revalidatePath(`/events/${eventSlug}`);
  redirect(`/events/${eventSlug}`);
}
