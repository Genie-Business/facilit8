"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { fundTrainingEvent } from "@/lib/services/event-funding.service";
import { payFacilitatorForEvent } from "@/lib/services/payout.service";
import { ActionState } from "@/lib/actions/shared";

export async function fundEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const slug = formData.get("slug");
  const eventId = formData.get("eventId");
  if (typeof slug !== "string" || typeof eventId !== "string" || !slug || !eventId) {
    return { error: "Missing event." };
  }

  const result = await fundTrainingEvent(eventId, session.user.id);
  if (!result.success) return { error: result.error };

  revalidatePath(`/events/${slug}`);
  redirect(`/events/${slug}`);
}

export async function completeEventAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");

  const slug = formData.get("slug");
  const eventId = formData.get("eventId");
  if (typeof slug !== "string" || typeof eventId !== "string" || !slug || !eventId) {
    redirect("/events");
  }

  await payFacilitatorForEvent(eventId, session.user.id);

  revalidatePath(`/events/${slug}`);
  redirect(`/events/${slug}`);
}
