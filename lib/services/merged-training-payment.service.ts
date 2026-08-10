import { prisma } from "@/lib/db";
import { getAccountBalance } from "@/lib/anchor/accounts";
import { bookTransfer, verifyTransfer } from "@/lib/anchor/transfers";
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
  if (!payer?.depositAccountId) return { success: false, error: "Your wallet isn't set up yet — complete KYC first." };

  const settlementAccountId = process.env.ANCHOR_SETTLEMENT_ACCOUNT_ID;
  if (!settlementAccountId) return { success: false, error: "Payments are not configured yet." };

  const amount = participant.numDelegates * Number(session.pricePerDelegate);
  const balance = await getAccountBalance(payer.depositAccountId);
  if (balance < amount) {
    return { success: false, error: `Insufficient balance (₦${balance.toLocaleString()}).` };
  }

  const reference = `mtpay_${participant.id.slice(0, 16)}`;

  try {
    const { transferId } = await bookTransfer({
      sourceAccountId: payer.depositAccountId,
      destinationAccountId: settlementAccountId,
      amountNaira: amount,
      reason: `Funding share for "${session.title}"`,
      reference,
    });

    const status = await verifyTransfer(transferId);
    if (!["successful", "completed"].includes(status)) {
      throw new Error(`Transfer not successful — status: ${status}`);
    }

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: participantUserId,
          type: "FUNDING",
          status: "SUCCESS",
          amount,
          currency: "NGN",
          reference,
          anchorTransferId: transferId,
          relatedMergedTrainingEventId: session.id,
          description: `Funded share of "${session.title}"`,
        },
      }),
      prisma.mergedTrainingParticipant.update({
        where: { id: participant.id },
        data: { hasPaid: true, amountPaid: amount, paidAt: new Date() },
      }),
    ]);

    await createNotification({
      userId: session.initiatorId,
      notificationType: "PAYMENT_CONFIRMED",
      message: `A participant paid their share for "${session.title}".`,
      link: `/merged-trainings/${session.slug}`,
    });

    await checkAndUpdateFundingStatus(session.id);

    return { success: true };
  } catch (err) {
    await prisma.transaction.create({
      data: {
        userId: participantUserId,
        type: "FUNDING",
        status: "FAILED",
        amount,
        currency: "NGN",
        reference,
        relatedMergedTrainingEventId: session.id,
        description: `Failed to fund share of "${session.title}"`,
      },
    });
    return { success: false, error: err instanceof Error ? err.message : "Payment failed." };
  }
}
