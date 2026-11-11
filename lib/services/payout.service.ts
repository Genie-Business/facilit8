import { prisma } from "@/lib/db";
import { AlreadyDoneError, describeLedgerError } from "@/lib/ledger/errors";
import { inLedgerTransaction, postJournal } from "@/lib/ledger/ledger.service";
import { payoutLegs } from "@/lib/ledger/journals";
import { calculateFee } from "./fee.service";
import { createNotification } from "./notification.service";
import { getConfirmedCoFacilitators } from "./merged-training-co-facilitator.service";
import { createAutoProfessionalDevelopment } from "./professional-development.service";
import { roundKobo, splitNetAmount } from "./payout-math";

interface PayoutResult {
  success: boolean;
  error?: string;
}

/** Every amount in the ledger is whole kobo, so the fee (a percentage, which isn't) is rounded once, here. */
async function payoutAmounts(scope: "FACILITATOR_PAYOUT" | "MERGED_TRAINING_PAYOUT", gross: number) {
  const feeAmount = roundKobo(await calculateFee(scope, gross));
  return { feeAmount, netAmount: roundKobo(gross - feeAmount) };
}

/**
 * A payout that failed for a reason other than "someone already did this". The facilitator is told
 * and a FAILED TrainingPayment row is left for the admin; the reference is suffixed because the
 * success reference is unique and a retry has to be able to use it.
 */
async function recordFailedPayout(input: {
  targetType: "TRAINING_EVENT" | "MERGED_TRAINING_EVENT";
  trainingEventId?: string;
  mergedTrainingEventId?: string;
  facilitatorId: string;
  grossAmount: number;
  feeAmount: number;
  netAmount: number;
  reference: string;
  message: string;
  emailBody: string;
}): Promise<void> {
  await prisma.trainingPayment
    .create({
      data: {
        targetType: input.targetType,
        trainingEventId: input.trainingEventId,
        mergedTrainingEventId: input.mergedTrainingEventId,
        facilitatorId: input.facilitatorId,
        grossAmount: input.grossAmount,
        feeAmount: input.feeAmount,
        netAmount: input.netAmount,
        reference: `${input.reference}_failed_${Date.now().toString(36)}`,
        status: "FAILED",
      },
    })
    .catch((err) => console.error("Couldn't record a failed payout:", err));
  await createNotification({
    userId: input.facilitatorId,
    notificationType: "PAYMENT_CONFIRMED",
    message: input.message,
    email: { subject: "A Facilit8 payout failed", html: `<p>${input.emailBody}</p>` },
  });
}

/**
 * Pays the selected facilitator out of escrow, net of the active platform fee, and marks the event
 * complete/paid. Mirrors Django's webapp/utils.py::make_facilitator_payment.
 *
 * The payout journal, the TrainingPayment row and the event's isPaid flag commit in ONE database
 * transaction, with the event "claimed" (isPaid false -> true) first, so an event can never be paid
 * twice and the money can never move without the event knowing.
 */
export async function payFacilitatorForEvent(eventId: string, requesterId: string): Promise<PayoutResult> {
  const event = await prisma.trainingEvent.findUnique({
    where: { id: eventId },
    include: {
      selectedTrainer: { select: { id: true, depositAccountId: true } },
      milestones: { select: { id: true } },
    },
  });
  if (!event) return { success: false, error: "Event not found." };
  if (event.companyId !== requesterId) return { success: false, error: "This isn't your event." };
  if (event.milestones.length > 0) {
    return { success: false, error: "This event uses milestone-based payouts. Pay out each milestone individually." };
  }
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

  const grossAmount = Number(event.trainingBudget);
  const { feeAmount, netAmount } = await payoutAmounts("FACILITATOR_PAYOUT", grossAmount);
  if (netAmount <= 0) return { success: false, error: "Net payout is zero or negative. Check the fee configuration." };

  const trainerId = event.selectedTrainerId;
  const reference = `facpay_${event.id}`;

  try {
    await inLedgerTransaction(async (tx) => {
      const claimed = await tx.trainingEvent.updateMany({
        where: { id: event.id, isPaid: false },
        data: { isPaid: true, isCompleted: true, completedAt: new Date() },
      });
      if (claimed.count !== 1) throw new AlreadyDoneError("This event has already been paid out.");

      await postJournal(
        {
          reference,
          type: "PAYOUT",
          description: `Facilitator payment for "${event.title}"`,
          legs: payoutLegs({ payees: [{ userId: trainerId, amount: netAmount }], fee: feeAmount }),
        },
        tx
      );
      await tx.trainingPayment.create({
        data: {
          targetType: "TRAINING_EVENT",
          trainingEventId: event.id,
          facilitatorId: trainerId,
          grossAmount,
          feeAmount,
          netAmount,
          reference,
          status: "SUCCESS",
        },
      });
    });
  } catch (err) {
    if (!(err instanceof AlreadyDoneError)) {
      await recordFailedPayout({
        targetType: "TRAINING_EVENT",
        trainingEventId: event.id,
        facilitatorId: trainerId,
        grossAmount,
        feeAmount,
        netAmount,
        reference,
        message: `Payment attempt for "${event.title}" failed. Please contact support.`,
        emailBody: `Your payment attempt for "${event.title}" failed. Please contact support.`,
      });
    }
    return { success: false, error: describeLedgerError(err, "The payout failed. Please try again or contact support.") };
  }

  await createNotification({
    userId: trainerId,
    notificationType: "PAYMENT_CONFIRMED",
    message: `You've been paid ₦${netAmount.toLocaleString()} (after ₦${feeAmount.toLocaleString()} platform fee) for facilitating "${event.title}".`,
  });

  // Auto-populate the facilitator's Professional Development history — never lets a
  // logging failure undo an already-successful payment.
  await createAutoProfessionalDevelopment(trainerId, {
    title: event.title,
    dateCompleted: new Date(),
    skillsAcquired: [event.skillType].filter(Boolean),
    relatedTrainingEventId: event.id,
  }).catch(() => {});

  return { success: true };
}

/**
 * Pays out a single milestone instead of the event's full budget in one shot. Only runs for
 * events that have milestones defined at all (payFacilitatorForEvent refuses to run once any
 * exist, so the two payout paths can never double-pay the same escrow). Marks the parent
 * event isPaid/isCompleted once every milestone has been paid out.
 */
export async function payFacilitatorForMilestone(milestoneId: string, requesterId: string): Promise<PayoutResult> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    include: {
      trainingEvent: {
        include: {
          selectedTrainer: { select: { id: true, depositAccountId: true } },
          milestones: true,
        },
      },
    },
  });
  if (!milestone) return { success: false, error: "Milestone not found." };
  const event = milestone.trainingEvent;

  if (event.companyId !== requesterId) return { success: false, error: "This isn't your event." };
  if (milestone.isPaidOut) return { success: false, error: "This milestone has already been paid out." };
  if (!event.selectedTrainerId || !event.selectedTrainer) {
    return { success: false, error: "No facilitator has been selected for this event." };
  }
  if (event.approval !== "APPROVED") return { success: false, error: "This event hasn't been funded yet." };
  if (!event.selectedTrainer.depositAccountId) {
    return { success: false, error: "The facilitator's wallet isn't set up yet." };
  }

  const milestoneTotal = event.milestones.reduce((sum, m) => sum + Number(m.amount), 0);
  if (Math.round(milestoneTotal * 100) !== Math.round(Number(event.trainingBudget) * 100)) {
    return { success: false, error: "Milestone amounts don't add up to the funded budget yet. Fix them before paying out." };
  }

  const grossAmount = Number(milestone.amount);
  const { feeAmount, netAmount } = await payoutAmounts("FACILITATOR_PAYOUT", grossAmount);
  if (netAmount <= 0) return { success: false, error: "Net payout is zero or negative. Check the fee configuration." };

  const trainerId = event.selectedTrainerId;
  const reference = `msfacpay_${milestone.id}`;
  const allPaidOut = event.milestones.every((m) => m.id === milestone.id || m.isPaidOut);

  try {
    await inLedgerTransaction(async (tx) => {
      const claimed = await tx.milestone.updateMany({
        where: { id: milestone.id, isPaidOut: false },
        data: { isPaidOut: true, paidOutAt: new Date() },
      });
      if (claimed.count !== 1) throw new AlreadyDoneError("This milestone has already been paid out.");

      await postJournal(
        {
          reference,
          type: "PAYOUT",
          description: `Milestone payment for "${event.title}": ${milestone.title}`,
          legs: payoutLegs({ payees: [{ userId: trainerId, amount: netAmount }], fee: feeAmount }),
        },
        tx
      );
      await tx.trainingPayment.create({
        data: {
          targetType: "TRAINING_EVENT",
          trainingEventId: event.id,
          facilitatorId: trainerId,
          grossAmount,
          feeAmount,
          netAmount,
          reference,
          status: "SUCCESS",
        },
      });
      if (allPaidOut) {
        await tx.trainingEvent.update({
          where: { id: event.id },
          data: { isPaid: true, isCompleted: true, completedAt: new Date() },
        });
      }
    });
  } catch (err) {
    if (!(err instanceof AlreadyDoneError)) {
      await recordFailedPayout({
        targetType: "TRAINING_EVENT",
        trainingEventId: event.id,
        facilitatorId: trainerId,
        grossAmount,
        feeAmount,
        netAmount,
        reference,
        message: `Payment attempt for the "${milestone.title}" milestone of "${event.title}" failed. Please contact support.`,
        emailBody: `Your payment attempt for the "${milestone.title}" milestone of "${event.title}" failed. Please contact support.`,
      });
    }
    return { success: false, error: describeLedgerError(err, "The payout failed. Please try again or contact support.") };
  }

  await createNotification({
    userId: trainerId,
    notificationType: "PAYMENT_CONFIRMED",
    message: `You've been paid ₦${netAmount.toLocaleString()} for the "${milestone.title}" milestone of "${event.title}".`,
  });

  if (allPaidOut) {
    await createAutoProfessionalDevelopment(trainerId, {
      title: event.title,
      dateCompleted: new Date(),
      skillsAcquired: [event.skillType].filter(Boolean),
      relatedTrainingEventId: event.id,
    }).catch(() => {});
  }

  return { success: true };
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
 * initiator + every confirmed co-facilitator instead of going 100% to selectedTrainer.
 *
 * Everyone is paid in one journal inside one transaction: the whole payout happens, or none of it
 * does. (The old per-person transfers could leave a session half-paid and needing manual repair.) */
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
    return { success: false, error: "No facilitator has been selected yet. Voting must finalize first." };
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

  const grossAmount = roundKobo(session.participants.reduce((sum, p) => sum + Number(p.amountPaid), 0));
  const { feeAmount, netAmount } = await payoutAmounts("MERGED_TRAINING_PAYOUT", grossAmount);
  if (netAmount <= 0) return { success: false, error: "Net payout is zero or negative. Check the fee configuration." };

  // Equal split, remainder (from rounding to the kobo) goes to the first payee — the
  // initiator/selectedTrainer — so shares always sum exactly to netAmount.
  const shares = splitNetAmount(netAmount, payees.length);
  const reference = `mtfacpay_${session.id}`;

  try {
    await inLedgerTransaction(async (tx) => {
      const claimed = await tx.mergedTrainingEvent.updateMany({
        where: { id: session.id, isPaid: false },
        data: { isPaid: true, isCompleted: true, completedAt: new Date() },
      });
      if (claimed.count !== 1) throw new AlreadyDoneError("This session has already been paid out.");

      await postJournal(
        {
          reference,
          type: "PAYOUT",
          description: `Facilitator payment for "${session.title}"`,
          legs: payoutLegs({ payees: payees.map((payee, i) => ({ userId: payee.id, amount: shares[i] })), fee: feeAmount }),
        },
        tx
      );
      for (let i = 0; i < payees.length; i++) {
        await tx.trainingPayment.create({
          data: {
            targetType: "MERGED_TRAINING_EVENT",
            mergedTrainingEventId: session.id,
            facilitatorId: payees[i].id,
            grossAmount: i === 0 ? grossAmount : 0,
            feeAmount: i === 0 ? feeAmount : 0,
            netAmount: shares[i],
            reference: `${reference}_${payees[i].id}`,
            status: "SUCCESS",
          },
        });
      }
    });
  } catch (err) {
    if (!(err instanceof AlreadyDoneError)) {
      await recordFailedPayout({
        targetType: "MERGED_TRAINING_EVENT",
        mergedTrainingEventId: session.id,
        facilitatorId: payees[0].id,
        grossAmount,
        feeAmount,
        netAmount,
        reference,
        message: `Your payment for "${session.title}" failed. Please contact support.`,
        emailBody: `Your payment for "${session.title}" failed. Please contact support.`,
      });
    }
    return { success: false, error: describeLedgerError(err, "The payout failed. Please try again or contact support.") };
  }

  await Promise.all(
    payees.map((payee, i) =>
      createNotification({
        userId: payee.id,
        notificationType: "PAYMENT_CONFIRMED",
        message:
          payees.length > 1
            ? `You've been paid ₦${shares[i].toLocaleString()} as your split of the facilitator payment for "${session.title}".`
            : `You've been paid ₦${shares[i].toLocaleString()} (after ₦${feeAmount.toLocaleString()} platform fee) for facilitating "${session.title}".`,
      })
    )
  );

  // Auto-populate Professional Development history for every paid facilitator (initiator +
  // confirmed co-facilitators) — never lets a logging failure undo already-successful payments.
  const completedAt = new Date();
  await Promise.all(
    payees.map((payee) =>
      createAutoProfessionalDevelopment(payee.id, {
        title: session.title,
        dateCompleted: completedAt,
        skillsAcquired: [session.eventCategory].filter(Boolean),
        relatedMergedTrainingEventId: session.id,
      }).catch(() => {})
    )
  );

  return { success: true };
}
