import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/services/notification.service";

interface VoteResult {
  success: boolean;
  error?: string;
}

interface VoterPool {
  participants: { companyId: string }[];
  invites: { companyId: string }[];
}

/**
 * The voting body is every company with a stake in the session: everyone who joined
 * (participants) plus everyone invited to join, whether or not they've funded a slot yet —
 * an invite-only session's invite list is who the initiator meant to include in the decision.
 * Deduped, since a participant usually also appears in the invite list.
 */
export function eligibleVoterIds(session: VoterPool): string[] {
  return [...new Set([...session.participants.map((p) => p.companyId), ...session.invites.map((i) => i.companyId)])];
}

/**
 * Casts one eligible voter's vote for a bid. Voting only opens once the funding deadline has
 * passed; a bid is auto-finalized (selected, all others rejected) the moment it crosses a
 * strict majority of eligible voters.
 */
export async function castVote(mergerApplicationId: string, voterId: string): Promise<VoteResult> {
  const application = await prisma.mergerApplication.findUnique({
    where: { id: mergerApplicationId },
    include: { mergedTrainingEvent: { include: { participants: true, invites: true } } },
  });
  if (!application) return { success: false, error: "Bid not found." };

  const session = application.mergedTrainingEvent;
  if (session.selectedTrainerId) return { success: false, error: "A facilitator has already been selected." };
  if (new Date() < session.deadline) return { success: false, error: "Voting opens after the funding deadline." };

  const voterIds = eligibleVoterIds(session);
  if (!voterIds.includes(voterId)) return { success: false, error: "Only invitees and participants can vote." };

  const existingVote = await prisma.bidVote.findUnique({
    where: { voterId_mergerApplicationId: { voterId, mergerApplicationId: application.id } },
  });
  if (existingVote) return { success: false, error: "You've already voted for this bid." };

  await prisma.bidVote.create({ data: { voterId, mergerApplicationId: application.id } });

  const totalVoters = voterIds.length;
  const votesForThisApplication = await prisma.bidVote.count({ where: { mergerApplicationId: application.id } });

  if (votesForThisApplication > totalVoters / 2) {
    await prisma.$transaction([
      prisma.mergerApplication.update({
        where: { id: application.id },
        data: { isSelected: true, status: "ACCEPTED" },
      }),
      prisma.mergerApplication.updateMany({
        where: { mergedTrainingEventId: session.id, id: { not: application.id } },
        data: { status: "REJECTED", isSelected: false },
      }),
      prisma.mergedTrainingEvent.update({
        where: { id: session.id },
        data: { selectedTrainerId: application.trainerId },
      }),
    ]);

    await createNotification({
      userId: application.trainerId,
      notificationType: "BID_ACCEPTED",
      message: `You were selected by majority vote to facilitate "${session.title}".`,
      link: `/merged-trainings/${session.slug}`,
    });

    const others = await prisma.mergerApplication.findMany({
      where: { mergedTrainingEventId: session.id, id: { not: application.id } },
    });
    for (const other of others) {
      await createNotification({
        userId: other.trainerId,
        notificationType: "BID_REJECTED",
        message: `Your application for "${session.title}" was not selected.`,
        link: `/merged-trainings/${session.slug}`,
      });
    }
  }

  return { success: true };
}
