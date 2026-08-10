"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { eventFormSchema } from "@/lib/validation/event";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

export async function createEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session || session.user.role !== "EVENT_MANAGER") {
    return { error: "Only Event Managers can create training events." };
  }

  const raw = Object.fromEntries(formData);
  const parsed = eventFormSchema.safeParse({
    ...raw,
    trainingMaterials: formData.get("trainingMaterials") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }
  const data = parsed.data;
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  const slug = await generateUniqueSlug(
    data.title,
    async (candidate) => (await prisma.trainingEvent.findUnique({ where: { slug: candidate } })) !== null
  );

  const event = await prisma.trainingEvent.create({
    data: {
      companyId: session.user.id,
      title: data.title,
      startDate,
      endDate,
      location: data.location,
      capacity: data.capacity,
      skillType: data.skillType,
      expectedTrainingSkills: data.expectedTrainingSkills || null,
      eventObjective: data.eventObjective || null,
      delegatesLevel: data.delegatesLevel,
      eventCategory: data.eventCategory,
      venueType: data.venueType,
      seriesLength: data.seriesLength ? Number(data.seriesLength) : null,
      durationDays: daysBetween(startDate, endDate),
      eventExpiryDate: new Date(data.eventExpiryDate),
      eventDetails: data.eventDetails || null,
      trainingMaterials: !!data.trainingMaterials,
      trainingBudget: data.trainingBudget,
      slug,
      // Not open for applications until the Event Manager funds it — see
      // lib/services/event-funding.service.ts, which flips this to true.
      isAvailable: false,
    },
  });

  revalidatePath("/events");
  redirect(`/events/${event.slug}`);
}

export async function updateEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const slug = formData.get("slug");
  if (typeof slug !== "string" || !slug) return { error: "Missing event." };

  const event = await prisma.trainingEvent.findUnique({ where: { slug } });
  if (!event) return { error: "Event not found." };
  if (event.companyId !== session.user.id) {
    return { error: "You don't have permission to edit this event." };
  }
  if (event.selectedTrainerId) {
    return { error: "This event already has a selected facilitator and can no longer be edited." };
  }

  const raw = Object.fromEntries(formData);
  const parsed = eventFormSchema.safeParse({
    ...raw,
    trainingMaterials: formData.get("trainingMaterials") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }
  const data = parsed.data;
  const startDate = new Date(data.startDate);
  const endDate = new Date(data.endDate);

  await prisma.trainingEvent.update({
    where: { id: event.id },
    data: {
      title: data.title,
      startDate,
      endDate,
      location: data.location,
      capacity: data.capacity,
      skillType: data.skillType,
      expectedTrainingSkills: data.expectedTrainingSkills || null,
      eventObjective: data.eventObjective || null,
      delegatesLevel: data.delegatesLevel,
      eventCategory: data.eventCategory,
      venueType: data.venueType,
      seriesLength: data.seriesLength ? Number(data.seriesLength) : null,
      durationDays: daysBetween(startDate, endDate),
      eventExpiryDate: new Date(data.eventExpiryDate),
      eventDetails: data.eventDetails || null,
      trainingMaterials: !!data.trainingMaterials,
      trainingBudget: data.trainingBudget,
    },
  });

  revalidatePath(`/events/${slug}`);
  redirect(`/events/${slug}`);
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) redirect("/login");

  const slug = formData.get("slug");
  if (typeof slug !== "string" || !slug) redirect("/events");

  const event = await prisma.trainingEvent.findUnique({ where: { slug } });
  if (!event || event.companyId !== session.user.id) redirect("/events");
  if (event.selectedTrainerId) redirect(`/events/${slug}`);

  await prisma.trainingEvent.delete({ where: { id: event.id } });
  revalidatePath("/events");
  redirect("/events");
}
