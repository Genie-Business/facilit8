import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/services/notification.service";

/** Called at merged-training creation time by a Facilitator initiator. Never creates a
 * duplicate row for the same facilitator on the same session. */
export async function inviteCoFacilitators(mergedTrainingEventId: string, facilitatorIds: string[]): Promise<void> {
  if (facilitatorIds.length === 0) return;

  await prisma.mergedTrainingCoFacilitator.createMany({
    data: facilitatorIds.map((facilitatorId) => ({ mergedTrainingEventId, facilitatorId })),
    skipDuplicates: true,
  });

  const session = await prisma.mergedTrainingEvent.findUnique({ where: { id: mergedTrainingEventId } });
  if (!session) return;

  for (const facilitatorId of facilitatorIds) {
    await createNotification({
      userId: facilitatorId,
      notificationType: "EVENT_UPDATE",
      message: `You've been invited to co-facilitate "${session.title}".`,
      link: `/merged-trainings/${session.slug}`,
    });
  }
}

/** The invited facilitator accepts or declines. Only counts toward the payout split once
 * CONFIRMED — an unanswered or declined invite doesn't dilute the other facilitators' share. */
export async function respondToCoFacilitatorInvite(id: string, facilitatorId: string, accept: boolean): Promise<void> {
  const invite = await prisma.mergedTrainingCoFacilitator.findUnique({
    where: { id },
    include: { mergedTrainingEvent: true },
  });
  if (!invite) throw new Error("Invite not found.");
  if (invite.facilitatorId !== facilitatorId) throw new Error("Not authorized to respond to this invite.");

  await prisma.mergedTrainingCoFacilitator.update({
    where: { id },
    data: { status: accept ? "CONFIRMED" : "DECLINED", respondedAt: new Date() },
  });

  await createNotification({
    userId: invite.mergedTrainingEvent.initiatorId,
    notificationType: "EVENT_UPDATE",
    message: `A co-facilitator invite for "${invite.mergedTrainingEvent.title}" was ${accept ? "confirmed" : "declined"}.`,
    link: `/merged-trainings/${invite.mergedTrainingEvent.slug}`,
  });
}

/** The payee set (besides the initiator/selectedTrainer) for a facilitator payout split. */
export async function getConfirmedCoFacilitators(mergedTrainingEventId: string) {
  return prisma.mergedTrainingCoFacilitator.findMany({
    where: { mergedTrainingEventId, status: "CONFIRMED" },
    include: { facilitator: { select: { id: true, depositAccountId: true, firstName: true, lastName: true } } },
  });
}
