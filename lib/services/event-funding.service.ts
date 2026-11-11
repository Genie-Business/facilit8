import { prisma } from "@/lib/db";
import { AlreadyDoneError, describeLedgerError } from "@/lib/ledger/errors";
import { inLedgerTransaction, postJournal } from "@/lib/ledger/ledger.service";
import { fundingLegs } from "@/lib/ledger/journals";

interface FundResult {
  success: boolean;
  error?: string;
}

/**
 * Moves the event's training budget from the Event Manager's wallet into escrow. Mirrors Django's
 * confirm_standard_training_payment. On success, the event becomes APPROVED/paymentConfirmed — this
 * is the real gate for visibility to facilitators.
 *
 * The event is "claimed" (paymentConfirmed false -> true) in the SAME database transaction as the
 * ledger movement, so the money and the event's status commit together or not at all, and a double
 * click can't fund an event twice: the second attempt finds it already claimed and changes nothing.
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
    return { success: false, error: "Your wallet isn't set up yet. Complete KYC first." };
  }

  const amount = Number(event.trainingBudget);
  const reference = `evtfund_${event.id}`;

  try {
    await inLedgerTransaction(async (tx) => {
      const claimed = await tx.trainingEvent.updateMany({
        where: { id: event.id, paymentConfirmed: false },
        data: { approval: "APPROVED", paymentConfirmed: true, isAvailable: true },
      });
      if (claimed.count !== 1) throw new AlreadyDoneError("This event is already funded.");

      await postJournal(
        { reference, type: "EVENT_FUNDING", description: `Funded event "${event.title}"`, legs: fundingLegs(userId, amount) },
        tx
      );
      await tx.transaction.create({
        data: {
          userId,
          type: "FUNDING",
          status: "SUCCESS",
          amount,
          currency: "NGN",
          reference,
          relatedTrainingEventId: event.id,
          description: `Funded event "${event.title}"`,
        },
      });
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: describeLedgerError(err, "Funding failed. Please try again.") };
  }
}
