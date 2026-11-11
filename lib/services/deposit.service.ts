import { prisma } from "@/lib/db";
import { inLedgerTransaction, postJournal } from "@/lib/ledger/ledger.service";
import { depositLegs } from "@/lib/ledger/journals";
import { createNotification } from "@/lib/services/notification.service";

export interface DepositEvent {
  /** Paystack's id for the underlying transaction — the idempotency key for this deposit. */
  paystackTransactionId: string | number;
  /** What the sender paid, in kobo. */
  amountKobo: number;
  /** Paystack's fee on it, in kobo (taken out of what reaches Facilit8, not out of the user's credit). */
  feesKobo: number;
  customerCode?: string | null;
  /** The virtual account number it was paid into — used if the customer code doesn't match anyone. */
  receiverAccountNumber?: string | null;
  senderName?: string | null;
}

export type DepositOutcome = "credited" | "duplicate" | "user_not_found";

/**
 * Credits a bank transfer into a user's Paystack virtual account to their wallet. The user gets what
 * they SENT; Paystack's fee on the deposit is Facilit8's cost, recorded as an expense so the
 * ledger still agrees with Paystack's own balance (which receives the amount minus that fee).
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

  const gross = event.amountKobo / 100;
  // A fee at or above the deposit itself can't be right; credit the user rather than reject real money.
  const fee = event.feesKobo > 0 && event.feesKobo < event.amountKobo ? event.feesKobo / 100 : 0;
  const reference = `dep-${event.paystackTransactionId}`;

  const created = await inLedgerTransaction(async (tx) => {
    const journal = await postJournal(
      {
        reference,
        type: "DEPOSIT",
        description: `Deposit${event.senderName ? ` from ${event.senderName}` : ""}`,
        metadata: { paystackTransactionId: String(event.paystackTransactionId), paystackFee: fee },
        legs: depositLegs({ userId: user.id, gross, paystackFee: fee }),
      },
      tx
    );
    if (!journal.created) return false;

    await tx.transaction.create({
      data: {
        userId: user.id,
        type: "DEPOSIT",
        status: "SUCCESS",
        amount: gross,
        currency: "NGN",
        reference,
        description: `Deposit${event.senderName ? ` from ${event.senderName}` : ""}`,
        metadata: { paystackFee: fee },
      },
    });
    return true;
  });
  if (!created) return "duplicate";

  await createNotification({
    userId: user.id,
    notificationType: "PAYMENT_CONFIRMED",
    message: `₦${gross.toLocaleString("en-NG")} received.`,
    link: "/wallet",
  });
  return "credited";
}
