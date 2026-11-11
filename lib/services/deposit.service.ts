import { prisma } from "@/lib/db";
import { inLedgerTransaction, postJournal } from "@/lib/ledger/ledger.service";
import { depositLegs } from "@/lib/ledger/journals";
import { createNotification } from "@/lib/services/notification.service";

export interface DepositEvent {
  /** Paystack's id for the underlying transaction — the idempotency key for this deposit. */
  paystackTransactionId: string | number;
  /** What the sender paid, in kobo. */
  amountKobo: number;
  /** Paystack's fee on it, in kobo. The user bears it: it comes out of what they are credited. */
  feesKobo: number;
  customerCode?: string | null;
  /** The virtual account number it was paid into — used if the customer code doesn't match anyone. */
  receiverAccountNumber?: string | null;
  senderName?: string | null;
}

export type DepositOutcome = "credited" | "duplicate" | "user_not_found" | "nothing_to_credit";

const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`;

/**
 * Credits a bank transfer into a user's Paystack virtual account to their wallet. The user bears
 * Paystack's fee on the deposit: they are credited what actually reached Facilit8's balance (what was
 * sent minus the fee), so the wallet and Paystack's own balance always agree.
 *
 * Idempotent on Paystack's transaction id: a redelivered webhook credits nothing twice. Returns
 * "user_not_found" for money we can't attribute — the caller leaves that event unprocessed and
 * visible, because it means real money has arrived that nobody has been credited for.
 */
export async function creditDeposit(event: DepositEvent): Promise<DepositOutcome> {
  const user =
    (event.customerCode ? await prisma.user.findUnique({ where: { paystackCustomerCode: event.customerCode } }) : null) ??
    (event.receiverAccountNumber ? await prisma.user.findFirst({ where: { vaAccountNumber: event.receiverAccountNumber } }) : null);
  if (!user) return "user_not_found";

  const sent = event.amountKobo / 100;
  const fee = Math.max(event.feesKobo, 0) / 100;
  const credited = (event.amountKobo - Math.max(event.feesKobo, 0)) / 100;
  // A deposit that Paystack's fee swallows whole leaves nothing to credit (nothing reached the balance either).
  if (!(credited > 0)) {
    console.warn(`Deposit ${event.paystackTransactionId} of ${naira(sent)} was entirely consumed by Paystack's fee of ${naira(fee)}; nothing credited.`);
    return "nothing_to_credit";
  }

  const reference = `dep-${event.paystackTransactionId}`;
  const description = `Deposit${event.senderName ? ` from ${event.senderName}` : ""}${fee > 0 ? ` (${naira(sent)} sent, ${naira(fee)} bank fee)` : ""}`;

  const created = await inLedgerTransaction(async (tx) => {
    const journal = await postJournal(
      {
        reference,
        type: "DEPOSIT",
        description,
        metadata: { paystackTransactionId: String(event.paystackTransactionId), sent, paystackFee: fee },
        legs: depositLegs({ userId: user.id, gross: sent, paystackFee: fee }),
      },
      tx
    );
    if (!journal.created) return false;

    // `amount` is how much the wallet moved, i.e. what was credited, the same way a withdrawal's is what left it.
    await tx.transaction.create({
      data: {
        userId: user.id,
        type: "DEPOSIT",
        status: "SUCCESS",
        amount: credited,
        feeAmount: fee > 0 ? fee : undefined,
        netAmount: credited,
        currency: "NGN",
        reference,
        description,
        metadata: { sent, paystackFee: fee },
      },
    });
    return true;
  });
  if (!created) return "duplicate";

  await createNotification({
    userId: user.id,
    notificationType: "PAYMENT_CONFIRMED",
    message: fee > 0 ? `${naira(credited)} received (${naira(sent)} sent, less a ${naira(fee)} bank fee).` : `${naira(credited)} received.`,
    link: "/wallet",
  });
  return "credited";
}
