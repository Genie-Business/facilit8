import { prisma } from "@/lib/db";
import { bookTransfer, verifyTransfer } from "@/lib/anchor/transfers";
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

    const amount = dispute.trainingEvent
      ? Number(dispute.trainingEvent.trainingBudget)
      : dispute.mergedTrainingEvent!.participants.reduce((sum, p) => sum + Number(p.amountPaid), 0);
    if (amount <= 0) return { success: false, error: "Nothing was funded for this — nothing to refund." };

    const settlementAccountId = process.env.ANCHOR_SETTLEMENT_ACCOUNT_ID;
    if (!settlementAccountId) return { success: false, error: "Payments are not configured yet." };

    const reference = `refund_${dispute.id.slice(0, 16)}`;
    try {
      const { transferId } = await bookTransfer({
        sourceAccountId: settlementAccountId,
        destinationAccountId: depositAccountId,
        amountNaira: amount,
        reason: `Dispute refund for "${target.title}"`,
        reference,
      });

      const status = await verifyTransfer(transferId);
      if (!["successful", "completed"].includes(status)) {
        throw new Error(`Transfer not successful, status: ${status}`);
      }

      await prisma.transaction.create({
        data: {
          userId: recipientId,
          type: "REFUND",
          status: "SUCCESS",
          amount,
          currency: "NGN",
          reference,
          anchorTransferId: transferId,
          ...(dispute.trainingEvent
            ? { relatedTrainingEventId: dispute.trainingEvent.id }
            : { relatedMergedTrainingEventId: dispute.mergedTrainingEvent!.id }),
          description: `Dispute refund for "${target.title}"`,
        },
      });

      // Close the books on this escrow amount the same way a completed payout would, so
      // payFacilitatorForEvent/payFacilitatorForMergedTrainingEvent can never also pay out
      // funds that have already been refunded.
      if (dispute.trainingEvent) {
        await prisma.trainingEvent.update({ where: { id: dispute.trainingEvent.id }, data: { isPaid: true } });
      } else {
        await prisma.mergedTrainingEvent.update({ where: { id: dispute.mergedTrainingEvent!.id }, data: { isPaid: true } });
      }

      refundedAmount = amount;
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Refund transfer failed." };
    }
  }

  await prisma.dispute.update({
    where: { id: dispute.id },
    data: {
      status: input.status,
      resolutionNotes: input.resolutionNotes,
      resolvedById: input.resolvedById,
      resolvedAt: new Date(),
    },
  });

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
