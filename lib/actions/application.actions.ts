"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { applicationFormSchema } from "@/lib/validation/application";
import { createNotification } from "@/lib/services/notification.service";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";
import { siteUrl } from "@/lib/site";

export async function applyToEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session || session.user.role !== "FACILITATOR") {
    return { error: "Only Facilitators can apply to training events." };
  }

  const eventSlug = formData.get("eventSlug");
  if (typeof eventSlug !== "string" || !eventSlug) return { error: "Missing event." };

  const event = await prisma.trainingEvent.findUnique({ where: { slug: eventSlug } });
  if (!event) return { error: "Event not found." };
  if (!event.isAvailable) return { error: "This event is no longer accepting applications." };

  const existing = await prisma.application.findUnique({
    where: { trainerId_trainingEventId: { trainerId: session.user.id, trainingEventId: event.id } },
  });
  if (existing) return { error: "You've already applied to this event." };

  const raw = Object.fromEntries(formData);
  const parsed = applicationFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const slug = await generateUniqueSlug(
    `${event.title}-bid`,
    async (candidate) => (await prisma.application.findUnique({ where: { slug: candidate } })) !== null
  );

  await prisma.application.create({
    data: {
      trainerId: session.user.id,
      trainingEventId: event.id,
      courseBreakdown: parsed.data.courseBreakdown || null,
      objective: parsed.data.objective || null,
      classActivities: parsed.data.classActivities || null,
      budgetPerDelegate: parsed.data.budgetPerDelegate,
      slug,
    },
  });

  await createNotification({
    userId: event.companyId,
    message: `${session.user.name ?? "A facilitator"} applied to facilitate "${event.title}".`,
    notificationType: "BID_RECEIVED",
    link: `/events/${event.slug}/applications`,
  });

  revalidatePath(`/events/${event.slug}`);
  redirect(`/events/${event.slug}`);
}

export async function selectApplicationAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) redirect(`${siteUrl}/login`);

  const applicationSlug = formData.get("applicationSlug");
  if (typeof applicationSlug !== "string" || !applicationSlug) redirect("/events");

  const application = await prisma.application.findUnique({
    where: { slug: applicationSlug },
    include: { trainingEvent: true },
  });
  if (!application) redirect("/events");

  const event = application.trainingEvent;
  if (event.companyId !== session.user.id || !event.isAvailable) {
    redirect(`/events/${event.slug}`);
  }

  const siblingApplications = await prisma.application.findMany({
    where: { trainingEventId: event.id, id: { not: application.id } },
  });

  await prisma.$transaction([
    prisma.application.update({
      where: { id: application.id },
      data: { isSelected: true, status: "ACCEPTED" },
    }),
    prisma.application.updateMany({
      where: { trainingEventId: event.id, id: { not: application.id } },
      data: { status: "REJECTED", isSelected: false },
    }),
    prisma.trainingEvent.update({
      where: { id: event.id },
      data: { selectedTrainerId: application.trainerId, isAvailable: false },
    }),
  ]);

  await createNotification({
    userId: application.trainerId,
    message: `You were selected to facilitate "${event.title}".`,
    notificationType: "BID_ACCEPTED",
    link: `/events/${event.slug}`,
  });

  for (const sibling of siblingApplications) {
    await createNotification({
      userId: sibling.trainerId,
      message: `Your application for "${event.title}" was not selected.`,
      notificationType: "BID_REJECTED",
      link: `/events/${event.slug}`,
    });
  }

  revalidatePath(`/events/${event.slug}`);
  redirect(`/events/${event.slug}/applications`);
}
