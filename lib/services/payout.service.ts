import { prisma } from "@/lib/db";
import { bookTransfer, verifyTransfer } from "@/lib/anchor/transfers";
import { calculateFee } from "./fee.service";
import { createNotification } from "./notification.service";
import { getConfirmedCoFacilitators } from "./merged-training-co-facilitator.service";

interface PayoutResult {
  success: boolean;
  error?: string;
}

/**
 * Pays the selected facilitator out of the platform settlement account, net of the active
 * platform fee, and marks the event complete/paid. Mirrors Django's
 * webapp/utils.py::make_facilitator_payment, including logging a FAILED TrainingPayment on
 * error rather than swallowing it.
 */
export async function payFacilitatorForEvent(eventId: string, requesterId: string): Promise<PayoutResult> {
  const event = await prisma.trainingEvent.findUnique({
    where: { id: eventId },
    include: { selectedTrainer: { select: { id: true, depositAccountId: true } } },
  });
  if (!event) return { success: false, error: "Event not found." };
  if (event.companyId !== requesterId) return { success: false, error: "This isn't your event." };
  if (event.isPaid) return { success: false, error: "This event has already been paid out." };
  if (!event.selectedTrainerId || !event.selectedTrainer) {
    return { success: false, error: "No facilitator has been selected for this event." };
  }
  if (event.approval !== "APPROVED") {
    return { success: false, error: "This event hasn't been funded yet." };
  }
  if (!event.selectedTrainer.depositAccountId) {
    return { success: false, error: "The facilitator's wallet isn't set up yet." };
  }

  const settlementAccountId = process.env.ANCHOR_SETTLEMENT_ACCOUNT_ID;
  if (!settlementAccountId) return { success: false, error: "Payments are not configured yet." };

  const grossAmount = Number(event.trainingBudget);
  const feeAmount = await calculateFee("FACILITATOR_PAYOUT", grossAmount);
  const netAmount = grossAmount - feeAmount;
  if (netAmount <= 0) return { success: false, error: "Net payout is zero or negative — check the fee configuration." };

  const reference = `facpay_${event.id.slice(0, 16)}`;

  try {
    const { transferId, raw } = await bookTransfer({
      sourceAccountId: settlementAccountId,
      destinationAccountId: event.selectedTrainer.depositAccountId,
      amountNaira: netAmount,
      reason: `Facilitator payment for "${event.title}"`,
      reference,
    });

    const status = await verifyTransfer(transferId);
    if (!["successful", "completed"].includes(status)) {
      throw new Error(`Transfer not successful — status: ${status}`);
    }

    await prisma.$transaction([
      prisma.trainingPayment.create({
        data: {
          targetType: "TRAINING_EVENT",
          trainingEventId: event.id,
          facilitatorId: event.selectedTrainerId,
          grossAmount,
          feeAmount,
          netAmount,
          reference,
          rawResponse: raw as never,
          status: "SUCCESS",
        },
      }),
      prisma.trainingEvent.update({
        where: { id: event.id },
        data: { isPaid: true, isCompleted: true, completedAt: new Date() },
      }),
    ]);

    await createNotification({
      userId: event.selectedTrainerId,
      notificationType: "PAYMENT_CONFIRMED",
      message: `You've been paid ₦${netAmount.toLocaleString()} (after ₦${feeAmount.toLocaleString()} platform fee) for facilitating "${event.title}".`,
    });

    return { success: true };
  } catch (err) {
    await prisma.trainingPayment.create({
      data: {
        targetType: "TRAINING_EVENT",
        trainingEventId: event.id,
        facilitatorId: event.selectedTrainerId,
        grossAmount,
        feeAmount,
        netAmount,
        reference,
        status: "FAILED",
      },
    });
    await createNotification({
      userId: event.selectedTrainerId,
      notificationType: "PAYMENT_CONFIRMED",
      message: `Payment attempt for "${event.title}" failed. Please contact support.`,
    });
    return { success: false, error: err instanceof Error ? err.message : "Payout failed." };
  }
}

interface Payee {
  id: string;
  depositAccountId: string | null;
  label: string;
}

/** Same shape as payFacilitatorForEvent, but for a MergedTrainingEvent — gross is the sum
 * of what participants actually paid in, not a fixed budget field. When the initiator has
 * confirmed co-facilitators (Facilitator-initiated sessions only — see
 * merged-training-co-facilitator.service.ts), the net amount splits evenly across the
 * initiator + every confirmed co-facilitator instead of going 100% to selectedTrainer. */
export async function payFacilitatorForMergedTrainingEvent(
  mergedTrainingEventId: string,
  requesterId: string
): Promise<PayoutResult> {
  const session = await prisma.mergedTrainingEvent.findUnique({
    where: { id: mergedTrainingEventId },
    include: {
      selectedTrainer: { select: { id: true, depositAccountId: true, firstName: true, lastName: true } },
      participants: true,
    },
  });
  if (!session) return { success: false, error: "Session not found." };
  if (session.initiatorId !== requesterId) return { success: false, error: "Only the initiator can complete this." };
  if (session.isPaid) return { success: false, error: "This session has already been paid out." };
  if (!session.selectedTrainerId || !session.selectedTrainer) {
    return { success: false, error: "No facilitator has been selected yet — voting must finalize first." };
  }
  if (session.approval !== "APPROVED") {
    return { success: false, error: "This session hasn't been fully funded yet." };
  }

  const confirmedCoFacilitators = await getConfirmedCoFacilitators(session.id);
  const payees: Payee[] = [
    {
      id: session.selectedTrainer.id,
      depositAccountId: session.selectedTrainer.depositAccountId,
      label: `${session.selectedTrainer.firstName} ${session.selectedTrainer.lastName}`,
    },
    ...confirmedCoFacilitators.map((c) => ({
      id: c.facilitator.id,
      depositAccountId: c.facilitator.depositAccountId,
      label: `${c.facilitator.firstName} ${c.facilitator.lastName}`,
    })),
  ];

  const missingWallet = payees.find((p) => !p.depositAccountId);
  if (missingWallet) return { success: false, error: `${missingWallet.label}'s wallet isn't set up yet.` };

  const settlementAccountId = process.env.ANCHOR_SETTLEMENT_ACCOUNT_ID;
  if (!settlementAccountId) return { success: false, error: "Payments are not configured yet." };

  const grossAmount = session.participants.reduce((sum, p) => sum + Number(p.amountPaid), 0);
  const feeAmount = await calculateFee("MERGED_TRAINING_PAYOUT", grossAmount);
  const netAmount = grossAmount - feeAmount;
  if (netAmount <= 0) return { success: false, error: "Net payout is zero or negative — check the fee configuration." };

  // Equal split, remainder (from rounding to the kobo) goes to the first payee — the
  // initiator/selectedTrainer — so shares always sum exactly to netAmount.
  const baseShare = Math.floor((netAmount / payees.length) * 100) / 100;
  const remainder = Math.round((netAmount - baseShare * payees.length) * 100) / 100;

  const results: { payee: Payee; amount: number; success: boolean; error?: string }[] = [];

  for (let i = 0; i < payees.length; i++) {
    const payee = payees[i];
    const amount = i === 0 ? baseShare + remainder : baseShare;
    const reference = `mtfacpay_${session.id.slice(0, 10)}_${payee.id.slice(0, 8)}`;

    try {
      const { transferId, raw } = await bookTransfer({
        sourceAccountId: settlementAccountId,
        destinationAccountId: payee.depositAccountId!,
        amountNaira: amount,
        reason: `Facilitator payment for "${session.title}"`,
        reference,
      });

      const status = await verifyTransfer(transferId);
      if (!["successful", "completed"].includes(status)) {
        throw new Error(`Transfer not successful — status: ${status}`);
      }

      await prisma.trainingPayment.create({
        data: {
          targetType: "MERGED_TRAINING_EVENT",
          mergedTrainingEventId: session.id,
          facilitatorId: payee.id,
          grossAmount: i === 0 ? grossAmount : 0,
          feeAmount: i === 0 ? feeAmount : 0,
          netAmount: amount,
          reference,
          rawResponse: raw as never,
          status: "SUCCESS",
        },
      });
      await createNotification({
        userId: payee.id,
        notificationType: "PAYMENT_CONFIRMED",
        message:
          payees.length > 1
            ? `You've been paid ₦${amount.toLocaleString()} as your split of the facilitator payment for "${session.title}".`
            : `You've been paid ₦${amount.toLocaleString()} (after ₦${feeAmount.toLocaleString()} platform fee) for facilitating "${session.title}".`,
      });
      results.push({ payee, amount, success: true });
    } catch (err) {
      await prisma.trainingPayment.create({
        data: {
          targetType: "MERGED_TRAINING_EVENT",
          mergedTrainingEventId: session.id,
          facilitatorId: payee.id,
          grossAmount: i === 0 ? grossAmount : 0,
          feeAmount: i === 0 ? feeAmount : 0,
          netAmount: amount,
          reference,
          status: "FAILED",
        },
      });
      await createNotification({
        userId: payee.id,
        notificationType: "PAYMENT_CONFIRMED",
        message: `Your payment for "${session.title}" failed. Please contact support.`,
      });
      results.push({ payee, amount, success: false, error: err instanceof Error ? err.message : "Payout failed." });
    }
  }

  const failed = results.filter((r) => !r.success);
  if (failed.length > 0) {
    return {
      success: false,
      error: `${results.length - failed.length} of ${results.length} payouts succeeded — ${failed.map((f) => f.payee.label).join(", ")} failed. Contact support before retrying.`,
    };
  }

  await prisma.mergedTrainingEvent.update({
    where: { id: session.id },
    data: { isPaid: true, isCompleted: true, completedAt: new Date() },
  });

  return { success: true };
}
