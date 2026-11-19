import { prisma } from "@/lib/db";
import { AlreadyDoneError, describeLedgerError } from "@/lib/ledger/errors";
import { inLedgerTransaction, postJournal } from "@/lib/ledger/ledger.service";
import { refundLegs } from "@/lib/ledger/journals";
import { roundKobo } from "./payout-math";
import { createNotification } from "./notification.service";

interface DisputeResult {
  success: boolean;
  error?: string;
}

interface RaiseDisputeInput {
  targetType: "TRAINING_EVENT" | "MERGED_TRAINING_EVENT";
  targetId: string;
  raisedById: string;
  reason: string;
}

/**
 * MVP scope: only the Event Manager who funded the engagement can raise a dispute against
 * it, and only after it's been funded (approval === "APPROVED"). Facilitator-initiated
 * disputes (e.g. non-payment) aren't covered here — see the Dispute model's own comment in
 * schema.prisma for why refunds are manual-admin-only rather than automatic.
 */
export async function raiseDispute(input: RaiseDisputeInput): Promise<DisputeResult> {
  let title: string;
  let facilitatorId: string | null;

  if (input.targetType === "TRAINING_EVENT") {
    const event = await prisma.trainingEvent.findUnique({
      where: { id: input.targetId },
      select: { companyId: true, approval: true, title: true, selectedTrainerId: true },
    });
    if (!event) return { success: false, error: "Event not found." };
    if (event.companyId !== input.raisedById) return { success: false, error: "This isn't your event." };
    if (event.approval !== "APPROVED") return { success: false, error: "This event hasn't been funded yet." };
    title = event.title;
    facilitatorId = event.selectedTrainerId;
  } else {
    const session = await prisma.mergedTrainingEvent.findUnique({
      where: { id: input.targetId },
      select: { initiatorId: true, approval: true, title: true, selectedTrainerId: true },
    });
    if (!session) return { success: false, error: "Session not found." };
    if (session.initiatorId !== input.raisedById) {
      return { success: false, error: "Only the initiator can raise a dispute for this session." };
    }
    if (session.approval !== "APPROVED") return { success: false, error: "This session hasn't been fully funded yet." };
    title = session.title;
    facilitatorId = session.selectedTrainerId;
  }

  const existing = await prisma.dispute.findFirst({
    where: {
      targetType: input.targetType,
      ...(input.targetType === "TRAINING_EVENT"
        ? { trainingEventId: input.targetId }
        : { mergedTrainingEventId: input.targetId }),
      status: { in: ["OPEN", "UNDER_REVIEW"] },
    },
  });
  if (existing) return { success: false, error: "There's already an open dispute for this." };

  await prisma.dispute.create({
    data: {
      targetType: input.targetType,
      ...(input.targetType === "TRAINING_EVENT"
        ? { trainingEventId: input.targetId }
        : { mergedTrainingEventId: input.targetId }),
      raisedById: input.raisedById,
      reason: input.reason,
    },
  });

  if (facilitatorId) {
    await createNotification({
      userId: facilitatorId,
      notificationType: "SYSTEM",
      message: `A dispute has been raised for "${title}". Facilit8 support will review it.`,
    });
  }

  return { success: true };
}

export async function listDisputes() {
  return prisma.dispute.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      raisedBy: { select: { firstName: true, lastName: true, email: true } },
      resolvedBy: { select: { firstName: true, lastName: true } },
      trainingEvent: { select: { title: true, slug: true, isPaid: true } },
      mergedTrainingEvent: { select: { title: true, slug: true, isPaid: true } },
    },
  });
}

export async function markDisputeUnderReview(disputeId: string): Promise<DisputeResult> {
  const dispute = await prisma.dispute.findUnique({ where: { id: disputeId }, select: { status: true } });
  if (!dispute) return { success: false, error: "Dispute not found." };
  if (dispute.status !== "OPEN") return { success: false, error: "Only open disputes can be marked under review." };

  await prisma.dispute.update({ where: { id: disputeId }, data: { status: "UNDER_REVIEW" } });
  return { success: true };
}

interface ResolveDisputeInput {
  disputeId: string;
  resolvedById: string;
  status: "RESOLVED_REFUNDED" | "RESOLVED_NO_ACTION";
  resolutionNotes: string;
}

export async function resolveDispute(input: ResolveDisputeInput): Promise<DisputeResult> {
  const dispute = await prisma.dispute.findUnique({
    where: { id: input.disputeId },
    include: {
      trainingEvent: {
        select: {
          id: true,
          title: true,
          isPaid: true,
          trainingBudget: true,
          companyId: true,
          company: { select: { depositAccountId: true } },
        },
      },
      mergedTrainingEvent: {
        select: {
          id: true,
          title: true,
          isPaid: true,
          initiatorId: true,
          initiator: { select: { depositAccountId: true } },
          participants: { select: { amountPaid: true } },
        },
      },
    },
  });
  if (!dispute) return { success: false, error: "Dispute not found." };
  if (dispute.status === "RESOLVED_REFUNDED" || dispute.status === "RESOLVED_NO_ACTION") {
    return { success: false, error: "This dispute has already been resolved." };
  }

  const target = dispute.trainingEvent ?? dispute.mergedTrainingEvent;
  if (!target) return { success: false, error: "Dispute target no longer exists." };

  const recipientId = dispute.trainingEvent ? dispute.trainingEvent.companyId : dispute.mergedTrainingEvent!.initiatorId;
  let refundedAmount = 0;

  if (input.status === "RESOLVED_REFUNDED") {
    if (target.isPaid) {
      return {
        success: false,
        error:
          "This has already been paid out to the facilitator. Refunding requires manual, off-platform recovery, not an automatic reversal.",
      };
    }

    const depositAccountId = dispute.trainingEvent
      ? dispute.trainingEvent.company.depositAccountId
      : dispute.mergedTrainingEvent!.initiator.depositAccountId;
    if (!depositAccountId) return { success: false, error: "The recipient's wallet isn't set up." };

    const amount = roundKobo(
      dispute.trainingEvent
        ? Number(dispute.trainingEvent.trainingBudget)
        : dispute.mergedTrainingEvent!.participants.reduce((sum, p) => sum + Number(p.amountPaid), 0)
    );
    if (amount <= 0) return { success: false, error: "Nothing was funded for this — nothing to refund." };

    const reference = `refund_${dispute.id}`;
    try {
      // One transaction: close the books on the escrow (so a payout can never ALSO pay out money that
      // is being refunded, nor a second refund repeat it), return the money, and resolve the dispute.
      await inLedgerTransaction(async (tx) => {
        const claimed = dispute.trainingEvent
          ? await tx.trainingEvent.updateMany({ where: { id: dispute.trainingEvent.id, isPaid: false }, data: { isPaid: true } })
          : await tx.mergedTrainingEvent.updateMany({ where: { id: dispute.mergedTrainingEvent!.id, isPaid: false }, data: { isPaid: true } });
        if (claimed.count !== 1) throw new AlreadyDoneError("This has already been paid out or refunded.");

        await postJournal(
          { reference, type: "REFUND", description: `Dispute refund for "${target.title}"`, legs: refundLegs(recipientId, amount) },
          tx
        );
        await tx.transaction.create({
          data: {
            userId: recipientId,
            type: "REFUND",
            status: "SUCCESS",
            amount,
            currency: "NGN",
            reference,
            ...(dispute.trainingEvent
              ? { relatedTrainingEventId: dispute.trainingEvent.id }
              : { relatedMergedTrainingEventId: dispute.mergedTrainingEvent!.id }),
            description: `Dispute refund for "${target.title}"`,
          },
        });
        await tx.dispute.update({
          where: { id: dispute.id },
          data: {
            status: input.status,
            resolutionNotes: input.resolutionNotes,
            resolvedById: input.resolvedById,
            resolvedAt: new Date(),
          },
        });
      });
      refundedAmount = amount;
    } catch (err) {
      return { success: false, error: describeLedgerError(err, "The refund failed. Please try again.") };
    }
  }

  if (input.status === "RESOLVED_NO_ACTION") {
    await prisma.dispute.update({
      where: { id: dispute.id },
      data: {
        status: input.status,
        resolutionNotes: input.resolutionNotes,
        resolvedById: input.resolvedById,
        resolvedAt: new Date(),
      },
    });
  }

  const message =
    input.status === "RESOLVED_REFUNDED"
      ? `You've been refunded ₦${refundedAmount.toLocaleString()} for "${target.title}" after your dispute was resolved.`
      : `Your dispute for "${target.title}" has been reviewed: no refund was issued.`;

  await createNotification({
    userId: recipientId,
    notificationType: "PAYMENT_CONFIRMED",
    message,
    email: { subject: "Your Facilit8 dispute has been resolved", html: `<p>${message}</p>` },
  });

  return { success: true };
}
