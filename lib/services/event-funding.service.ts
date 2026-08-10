import { prisma } from "@/lib/db";
import { getAccountBalance } from "@/lib/anchor/accounts";
import { bookTransfer, verifyTransfer } from "@/lib/anchor/transfers";

interface FundResult {
  success: boolean;
  error?: string;
}

/**
 * Debits the Event Manager's wallet for the event's training budget and moves it to the
 * platform settlement account. Mirrors Django's confirm_standard_training_payment. On
 * success, the event becomes APPROVED/paymentConfirmed — this is the real gate for
 * visibility to facilitators (the Phase 2 stopgap that skipped this check is now replaced).
 */
export async function fundTrainingEvent(eventId: string, userId: string): Promise<FundResult> {
  const event = await prisma.trainingEvent.findUnique({
    where: { id: eventId },
    include: { company: { select: { id: true, depositAccountId: true } } },
  });
  if (!event) return { success: false, error: "Event not found." };
  if (event.companyId !== userId) return { success: false, error: "This isn't your event." };
  if (event.paymentConfirmed) return { success: false, error: "This event is already funded." };
  if (!event.company.depositAccountId) {
    return { success: false, error: "Your wallet isn't set up yet — complete KYC first." };
  }

  const settlementAccountId = process.env.ANCHOR_SETTLEMENT_ACCOUNT_ID;
  if (!settlementAccountId) return { success: false, error: "Payments are not configured yet." };

  const amount = Number(event.trainingBudget);
  const balance = await getAccountBalance(event.company.depositAccountId);
  if (balance < amount) {
    return { success: false, error: `Insufficient balance (₦${balance.toLocaleString()}).` };
  }

  const reference = `evtfund_${event.id.slice(0, 16)}`;

  try {
    const { transferId } = await bookTransfer({
      sourceAccountId: event.company.depositAccountId,
      destinationAccountId: settlementAccountId,
      amountNaira: amount,
      reason: `Funding for training event "${event.title}"`,
      reference,
    });

    const status = await verifyTransfer(transferId);
    if (!["successful", "completed"].includes(status)) {
      throw new Error(`Transfer not successful — status: ${status}`);
    }

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId,
          type: "FUNDING",
          status: "SUCCESS",
          amount,
          currency: "NGN",
          reference,
          anchorTransferId: transferId,
          relatedTrainingEventId: event.id,
          description: `Funded event "${event.title}"`,
        },
      }),
      prisma.trainingEvent.update({
        where: { id: event.id },
        data: { approval: "APPROVED", paymentConfirmed: true, isAvailable: true },
      }),
    ]);

    return { success: true };
  } catch (err) {
    await prisma.transaction.create({
      data: {
        userId,
        type: "FUNDING",
        status: "FAILED",
        amount,
        currency: "NGN",
        reference,
        relatedTrainingEventId: event.id,
        description: `Failed to fund event "${event.title}"`,
      },
    });
    return { success: false, error: err instanceof Error ? err.message : "Funding failed." };
  }
}
