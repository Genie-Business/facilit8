"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { createNotification } from "@/lib/services/notification.service";
import { payMergedTrainingShare } from "@/lib/services/merged-training-payment.service";
import { payFacilitatorForMergedTrainingEvent } from "@/lib/services/payout.service";
import { castVote } from "@/lib/services/merged-training-voting.service";
import { inviteCoFacilitators, respondToCoFacilitatorInvite } from "@/lib/services/merged-training-co-facilitator.service";
import {
  joinMergedTrainingFormSchema,
  mergedTrainingFormSchema,
  mergerApplicationFormSchema,
} from "@/lib/validation/merged-training";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";
import { siteUrl } from "@/lib/site";

function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.round(ms / (1000 * 60 * 60 * 24)) + 1);
}

const CREATOR_ROLES = ["EVENT_MANAGER", "PROFESSIONAL", "FACILITATOR"] as const;

export async function createMergedTrainingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session || !CREATOR_ROLES.includes(session.user.role as (typeof CREATOR_ROLES)[number])) {
    return { error: "Only Event Managers, Professionals, and Facilitators can start a merged training session." };
  }
  const isFacilitatorInitiated = session.user.role === "FACILITATOR";

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.depositAccountId) {
    return { error: "Your wallet isn't set up yet — complete KYC before starting a session." };
  }

  const raw = Object.fromEntries(formData);
  const parsed = mergedTrainingFormSchema.safeParse({
    ...raw,
    isInviteOnly: formData.get("isInviteOnly") === "on",
    // A Facilitator is proposing the session for others to fund, not funding a share
    // themselves, so their own delegate count doesn't apply.
    initiatorNumDelegates: isFacilitatorInitiated ? undefined : raw.initiatorNumDelegates,
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }
  const data = parsed.data;
  if (!isFacilitatorInitiated && data.initiatorNumDelegates === undefined) {
    return { fieldErrors: { initiatorNumDelegates: "Enter how many delegates you're bringing." } };
  }

  // A Facilitator initiator has two separate invite pickers (organisations to fund,
  // co-facilitators to invite); Event Manager/Professional initiators have one.
  const invitedOrgIds = isFacilitatorInitiated
    ? formData.getAll("invitedOrgIds").filter((v): v is string => typeof v === "string")
    : formData.getAll("invitedUserIds").filter((v): v is string => typeof v === "string");
  const invitedCoFacilitatorIds = formData
    .getAll("invitedCoFacilitatorIds")
    .filter((v): v is string => typeof v === "string");

  const slug = await generateUniqueSlug(
    data.title,
    async (candidate) => (await prisma.mergedTrainingEvent.findUnique({ where: { slug: candidate } })) !== null
  );

  const mergedEvent = await prisma.mergedTrainingEvent.create({
    data: {
      initiatorId: session.user.id,
      title: data.title,
      description: data.description || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      location: data.location,
      delegatesLevel: data.delegatesLevel,
      eventCategory: data.eventCategory,
      venueType: data.venueType,
      totalSlots: data.totalSlots,
      pricePerDelegate: data.pricePerDelegate,
      deadline: new Date(data.deadline),
      isInviteOnly: !!data.isInviteOnly,
      isPostedToBoard: !data.isInviteOnly,
      slug,
      // A Facilitator-initiated session has no funding participant for the initiator —
      // they're proposing and delivering, not paying — and skips the bid/vote process
      // entirely by naming themselves as the selected trainer immediately.
      ...(isFacilitatorInitiated
        ? { selectedTrainerId: session.user.id }
        : { participants: { create: { companyId: session.user.id, numDelegates: data.initiatorNumDelegates! } } }),
    },
  });

  if (data.isInviteOnly && invitedOrgIds.length > 0) {
    await prisma.mergedTrainingInvite.createMany({
      data: invitedOrgIds.map((companyId) => ({ mergedTrainingEventId: mergedEvent.id, companyId })),
      skipDuplicates: true,
    });
    for (const companyId of invitedOrgIds) {
      await createNotification({
        userId: companyId,
        notificationType: "EVENT_UPDATE",
        message: `You've been invited to join the merged training "${mergedEvent.title}".`,
        link: `/merged-trainings/${mergedEvent.slug}`,
      });
    }
  }

  if (isFacilitatorInitiated && invitedCoFacilitatorIds.length > 0) {
    await inviteCoFacilitators(mergedEvent.id, invitedCoFacilitatorIds);
  }

  revalidatePath("/merged-trainings");
  redirect(`/merged-trainings/${mergedEvent.slug}`);
}

export async function updateMergedTrainingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const slug = formData.get("slug");
  if (typeof slug !== "string" || !slug) return { error: "Missing session." };

  const existing = await prisma.mergedTrainingEvent.findUnique({ where: { slug } });
  if (!existing) return { error: "Session not found." };
  if (existing.initiatorId !== session.user.id) return { error: "You don't have permission to edit this session." };
  if (existing.paymentConfirmed) return { error: "This session is already funded and can no longer be edited." };

  const participantCount = await prisma.mergedTrainingParticipant.count({
    where: { mergedTrainingEventId: existing.id },
  });
  if (participantCount > 1) {
    return { error: "Other companies have already joined this session — it can no longer be edited." };
  }

  const raw = Object.fromEntries(formData);
  const parsed = mergedTrainingFormSchema.safeParse({
    ...raw,
    isInviteOnly: formData.get("isInviteOnly") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }
  const data = parsed.data;

  await prisma.mergedTrainingEvent.update({
    where: { id: existing.id },
    data: {
      title: data.title,
      description: data.description || null,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      location: data.location,
      delegatesLevel: data.delegatesLevel,
      eventCategory: data.eventCategory,
      venueType: data.venueType,
      totalSlots: data.totalSlots,
      pricePerDelegate: data.pricePerDelegate,
      deadline: new Date(data.deadline),
      isInviteOnly: !!data.isInviteOnly,
      isPostedToBoard: !data.isInviteOnly,
    },
  });

  revalidatePath(`/merged-trainings/${slug}`);
  redirect(`/merged-trainings/${slug}`);
}

const FUNDER_ROLES = ["EVENT_MANAGER", "PROFESSIONAL"] as const;

export async function joinMergedTrainingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session || !FUNDER_ROLES.includes(session.user.role as (typeof FUNDER_ROLES)[number])) {
    return { error: "Only Event Managers and Professionals can join a merged training session as a funder." };
  }

  const slug = formData.get("slug");
  if (typeof slug !== "string" || !slug) return { error: "Missing session." };

  const mergedEvent = await prisma.mergedTrainingEvent.findUnique({
    where: { slug },
    include: { participants: true, invites: true },
  });
  if (!mergedEvent) return { error: "Session not found." };
  if (mergedEvent.cancelled) return { error: "This session has been cancelled." };
  if (mergedEvent.isFullyFunded) return { error: "This session is already fully funded." };
  if (new Date() > mergedEvent.deadline) return { error: "The funding deadline has passed." };
  if (mergedEvent.participants.some((p) => p.companyId === session.user.id)) {
    return { error: "You've already joined this session." };
  }
  if (mergedEvent.isInviteOnly && !mergedEvent.invites.some((i) => i.companyId === session.user.id)) {
    return { error: "This session is invite-only." };
  }

  const parsed = joinMergedTrainingFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const reservedSlots = mergedEvent.participants.reduce((sum, p) => sum + p.numDelegates, 0);
  const remaining = mergedEvent.totalSlots - reservedSlots;
  if (parsed.data.numDelegates > remaining) {
    return { error: `Only ${remaining} slot${remaining === 1 ? "" : "s"} remaining.` };
  }

  await prisma.mergedTrainingParticipant.create({
    data: { mergedTrainingEventId: mergedEvent.id, companyId: session.user.id, numDelegates: parsed.data.numDelegates },
  });

  await createNotification({
    userId: mergedEvent.initiatorId,
    notificationType: "EVENT_UPDATE",
    message: `A new company joined "${mergedEvent.title}".`,
    link: `/merged-trainings/${mergedEvent.slug}`,
  });

  revalidatePath(`/merged-trainings/${slug}`);
  redirect(`/merged-trainings/${slug}`);
}

export async function payMergedTrainingShareAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const slug = formData.get("slug");
  const mergedTrainingEventId = formData.get("mergedTrainingEventId");
  if (typeof slug !== "string" || typeof mergedTrainingEventId !== "string" || !slug || !mergedTrainingEventId) {
    return { error: "Missing session." };
  }

  const result = await payMergedTrainingShare(mergedTrainingEventId, session.user.id);
  if (!result.success) return { error: result.error };

  revalidatePath(`/merged-trainings/${slug}`);
  redirect(`/merged-trainings/${slug}`);
}

export async function applyToMergedEventAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session || session.user.role !== "FACILITATOR") {
    return { error: "Only Facilitators can apply to merged training sessions." };
  }

  const slug = formData.get("mergedTrainingSlug");
  if (typeof slug !== "string" || !slug) return { error: "Missing session." };

  const mergedEvent = await prisma.mergedTrainingEvent.findUnique({ where: { slug } });
  if (!mergedEvent) return { error: "Session not found." };
  if (mergedEvent.selectedTrainerId) return { error: "This session already has a selected facilitator." };

  const existing = await prisma.mergerApplication.findUnique({
    where: { trainerId_mergedTrainingEventId: { trainerId: session.user.id, mergedTrainingEventId: mergedEvent.id } },
  });
  if (existing) return { error: "You've already applied to this session." };

  const parsed = mergerApplicationFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const applicationSlug = await generateUniqueSlug(
    `${mergedEvent.title}-bid`,
    async (candidate) => (await prisma.mergerApplication.findUnique({ where: { slug: candidate } })) !== null
  );

  await prisma.mergerApplication.create({
    data: {
      trainerId: session.user.id,
      mergedTrainingEventId: mergedEvent.id,
      courseBreakdown: parsed.data.courseBreakdown || null,
      objective: parsed.data.objective || null,
      classActivities: parsed.data.classActivities || null,
      budgetPerDelegate: parsed.data.budgetPerDelegate,
      slug: applicationSlug,
    },
  });

  const participants = await prisma.mergedTrainingParticipant.findMany({ where: { mergedTrainingEventId: mergedEvent.id } });
  for (const participant of participants) {
    await createNotification({
      userId: participant.companyId,
      notificationType: "BID_RECEIVED",
      message: `A facilitator applied to "${mergedEvent.title}".`,
      link: `/merged-trainings/${mergedEvent.slug}/applications`,
    });
  }

  revalidatePath(`/merged-trainings/${slug}`);
  redirect(`/merged-trainings/${slug}`);
}

export async function voteForBidAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) redirect(`${siteUrl}/login`);

  const slug = formData.get("slug");
  const applicationId = formData.get("applicationId");
  if (typeof slug !== "string" || typeof applicationId !== "string" || !slug || !applicationId) {
    redirect("/merged-trainings");
  }

  await castVote(applicationId, session.user.id);

  revalidatePath(`/merged-trainings/${slug}/applications`);
  redirect(`/merged-trainings/${slug}/applications`);
}

export async function completeMergedTrainingAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) redirect(`${siteUrl}/login`);

  const slug = formData.get("slug");
  const mergedTrainingEventId = formData.get("mergedTrainingEventId");
  if (typeof slug !== "string" || typeof mergedTrainingEventId !== "string" || !slug || !mergedTrainingEventId) {
    redirect("/merged-trainings");
  }

  await payFacilitatorForMergedTrainingEvent(mergedTrainingEventId, session.user.id);

  revalidatePath(`/merged-trainings/${slug}`);
  redirect(`/merged-trainings/${slug}`);
}

export async function cancelMergedTrainingAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session) redirect(`${siteUrl}/login`);

  const slug = formData.get("slug");
  if (typeof slug !== "string" || !slug) redirect("/merged-trainings");

  const mergedEvent = await prisma.mergedTrainingEvent.findUnique({
    where: { slug },
    include: { participants: true },
  });
  if (!mergedEvent || mergedEvent.initiatorId !== session.user.id || mergedEvent.isFullyFunded) {
    redirect(`/merged-trainings/${slug}`);
  }

  await prisma.mergedTrainingEvent.update({ where: { id: mergedEvent.id }, data: { cancelled: true, isPostedToBoard: false } });

  for (const participant of mergedEvent.participants) {
    if (participant.companyId === session.user.id) continue;
    await createNotification({
      userId: participant.companyId,
      notificationType: "EVENT_UPDATE",
      message: `"${mergedEvent.title}" was cancelled by the initiator.`,
    });
  }

  revalidatePath(`/merged-trainings/${slug}`);
  redirect(`/merged-trainings/${slug}`);
}

export async function respondToCoFacilitatorInviteAction(id: string, slug: string, accept: boolean): Promise<void> {
  const session = await auth();
  if (!session) redirect(`${siteUrl}/login`);

  await respondToCoFacilitatorInvite(id, session.user.id, accept);

  revalidatePath(`/merged-trainings/${slug}`);
  redirect(`/merged-trainings/${slug}`);
}
