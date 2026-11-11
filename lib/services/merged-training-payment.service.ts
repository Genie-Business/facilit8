import { prisma } from "@/lib/db";
import { AlreadyDoneError, describeLedgerError } from "@/lib/ledger/errors";
import { inLedgerTransaction, postJournal } from "@/lib/ledger/ledger.service";
import { fundingLegs } from "@/lib/ledger/journals";
import { createNotification } from "@/lib/services/notification.service";
import { checkAndUpdateFundingStatus } from "@/lib/services/merged-training-funding.service";

interface PaymentResult {
  success: boolean;
  error?: string;
}

export async function payMergedTrainingShare(
  mergedTrainingEventId: string,
  participantUserId: string
): Promise<PaymentResult> {
  const [session, participant, payer] = await Promise.all([
    prisma.mergedTrainingEvent.findUnique({ where: { id: mergedTrainingEventId } }),
    prisma.mergedTrainingParticipant.findUnique({
      where: { mergedTrainingEventId_companyId: { mergedTrainingEventId, companyId: participantUserId } },
    }),
    prisma.user.findUnique({ where: { id: participantUserId } }),
  ]);
  if (!session) return { success: false, error: "Session not found." };
  if (!participant) return { success: false, error: "You haven't joined this session." };
  if (participant.hasPaid) return { success: false, error: "You've already paid your share." };
  if (!payer?.depositAccountId) return { success: false, error: "Your wallet isn't set up yet. Complete KYC first." };

  const amount = participant.numDelegates * Number(session.pricePerDelegate);
  const reference = `mtpay_${participant.id}`;

  try {
    // The participant is claimed (hasPaid false -> true) in the same transaction as the money
    // moving, so a double click can't take the share twice.
    await inLedgerTransaction(async (tx) => {
      const claimed = await tx.mergedTrainingParticipant.updateMany({
        where: { id: participant.id, hasPaid: false },
        data: { hasPaid: true, amountPaid: amount, paidAt: new Date() },
      });
      if (claimed.count !== 1) throw new AlreadyDoneError("You've already paid your share.");

      await postJournal(
        { reference, type: "MERGED_FUNDING", description: `Funded share of "${session.title}"`, legs: fundingLegs(participantUserId, amount) },
        tx
      );
      await tx.transaction.create({
        data: {
          userId: participantUserId,
          type: "FUNDING",
          status: "SUCCESS",
          amount,
          currency: "NGN",
          reference,
          relatedMergedTrainingEventId: session.id,
          description: `Funded share of "${session.title}"`,
        },
      });
    });
  } catch (err) {
    return { success: false, error: describeLedgerError(err, "Payment failed. Please try again.") };
  }

  await createNotification({
    userId: session.initiatorId,
    notificationType: "PAYMENT_CONFIRMED",
    message: `A participant paid their share for "${session.title}".`,
    link: `/merged-trainings/${session.slug}`,
  });

  await checkAndUpdateFundingStatus(session.id);

  return { success: true };
}
