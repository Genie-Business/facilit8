"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { reviewFormSchema } from "@/lib/validation/review";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";

export async function createReviewAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session || session.user.role !== "EVENT_MANAGER") {
    return { error: "Only Event Managers can leave reviews." };
  }

  const facilitatorSlug = formData.get("facilitatorSlug");
  if (typeof facilitatorSlug !== "string" || !facilitatorSlug) {
    return { error: "Missing facilitator." };
  }

  const raw = Object.fromEntries(formData);
  const parsed = reviewFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const facilitator = await prisma.user.findUnique({ where: { slug: facilitatorSlug } });
  if (!facilitator) return { error: "Facilitator not found." };

  const event = await prisma.trainingEvent.findUnique({ where: { id: parsed.data.trainingEventId } });
  if (!event || event.companyId !== session.user.id || event.selectedTrainerId !== facilitator.id) {
    return { error: "You can only review a facilitator you selected for one of your own events." };
  }

  const existing = await prisma.review.findUnique({
    where: { reviewerId_trainingEventId: { reviewerId: session.user.id, trainingEventId: event.id } },
  });
  if (existing) return { error: "You've already reviewed this event." };

  await prisma.review.create({
    data: {
      reviewerId: session.user.id,
      revieweeId: facilitator.id,
      trainingEventId: event.id,
      rating: parsed.data.rating,
      feedback: parsed.data.feedback || null,
    },
  });

  revalidatePath(`/facilitators/${facilitatorSlug}`);
  return { success: "Review submitted." };
}
