import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { describeLedgerError } from "@/lib/ledger/errors";
import { getUserBalance, inLedgerTransaction, postJournal } from "@/lib/ledger/ledger.service";
import { withdrawalHoldLegs } from "@/lib/ledger/journals";
import { initiateTransfer } from "@/lib/paystack/api";
import { describePaystackError, isDefinitiveFailure, isPaystackConfigured } from "@/lib/paystack/client";
import { MIN_WITHDRAWAL_RECEIVE } from "@/lib/paystack/transfer-fees";
import { quoteWithdrawal } from "@/lib/wallet/withdrawal-quote";
import { getFeeSchedule } from "./fee.service";
import { roundKobo } from "./payout-math";
import { applyTransferOutcome } from "./withdrawal-settlement.service";

interface WithdrawResult {
  success: boolean;
  error?: string;
  /** What reaches the user's bank, and the two fees that make up the rest of what left their wallet. */
  receive?: number;
  facilit8Fee?: number;
  transferFee?: number;
  /** Paystack hasn't confirmed yet; the transaction list shows it as pending until it does. */
  pending?: boolean;
}

const UNAVAILABLE = "Withdrawals are temporarily unavailable. Please try again later.";

const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`;

/**
 * Starts a withdrawal. Mirrors Django's webapp/views.py flow: password re-confirmation, then the money.
 * The amount is what the user wants to RECEIVE; Facilit8's fee and Paystack's transfer fee are added
 * on top, and if that total is more than their balance the withdrawal is refused.
 *
 * Order matters, and it is what keeps this safe:
 *  1. the whole debit (bank amount + Facilit8's fee + Paystack's fee) leaves the wallet in the SAME
 *     database transaction that records the withdrawal — so the user can never spend it twice, and
 *     there is no moment where a transfer is in flight against money that is still spendable;
 *  2. only then is Paystack asked to send it;
 *  3. whatever Paystack answers decides where the held money goes (see withdrawal-settlement.service).
 *
 * If we can't tell whether Paystack received the request (a timeout, a 5xx), the money stays held and
 * the withdrawal stays pending: the catch-up job asks Paystack by reference and settles it. Releasing it
 * on a guess could pay the user twice — once to their bank and once back into their wallet.
 */
export async function withdrawFunds(userId: string, params: { amount: number; password: string }): Promise<WithdrawResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found." };

  const passwordValid = await bcrypt.compare(params.password, user.passwordHash);
  if (!passwordValid) return { success: false, error: "Incorrect password." };

  if (!user.depositAccountId) return { success: false, error: "Your wallet isn't set up yet. Complete KYC first." };
  if (!user.paystackRecipientCode) return { success: false, error: "Your bank account isn't linked yet." };
  if (!isPaystackConfigured()) return { success: false, error: UNAVAILABLE };

  const amount = roundKobo(params.amount);
  if (!(amount > 0)) return { success: false, error: "Enter an amount greater than zero." };

  const quoted = quoteWithdrawal(amount, await getFeeSchedule("WITHDRAWAL"));
  if (!quoted.ok) {
    return { success: false, error: `The smallest withdrawal is ${naira(MIN_WITHDRAWAL_RECEIVE)}.` };
  }
  const { quote } = quoted;

  // The user bears every fee on top of the amount they asked for, so what they need is the amount
  // PLUS the fees. If that's more than they have, they can't withdraw it. (The hold below enforces the
  // same limit atomically; this check is what lets us say exactly how much would be needed.)
  const balance = await getUserBalance(userId);
  if (quote.debit > balance) {
    return {
      success: false,
      error: `Your balance is too low. Withdrawing ${naira(quote.receive)} costs ${naira(quote.debit)} with fees (${naira(quote.facilit8Fee)} Facilit8 + ${naira(quote.transferFee)} bank transfer), and you have ${naira(balance)}.`,
    };
  }

  // 16-50 characters of lowercase letters, digits, "-" and "_" is Paystack's rule for a reference.
  const reference = `wd-${userId}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`.toLowerCase();

  try {
    await inLedgerTransaction(async (tx) => {
      await postJournal(
        {
          reference: `${reference}:hold`,
          type: "WITHDRAWAL_HOLD",
          description: "Withdrawal to bank",
          legs: withdrawalHoldLegs(userId, quote.debit),
        },
        tx
      );
      await tx.transaction.create({
        data: {
          userId,
          type: "WITHDRAWAL",
          status: "PENDING",
          // `amount` is everything that left the wallet; `feeAmount` is Facilit8's share of it (the
          // part that becomes revenue) and `netAmount` is what the bank receives. The rest is
          // Paystack's transfer fee, kept in the metadata so the statement can show all three.
          amount: quote.debit,
          feeAmount: quote.facilit8Fee,
          netAmount: quote.receive,
          currency: "NGN",
          reference,
          counterpartyAccountNumber: user.linkedAccountNumber ?? undefined,
          counterpartyBankCode: user.linkedBankCode ?? undefined,
          description: `Withdrawal to ${user.linkedBankName ?? "linked bank account"}`,
          metadata: { withdrawal: { requested: amount, transferFee: quote.transferFee } },
        },
      });
    });
  } catch (err) {
    return { success: false, error: describeLedgerError(err, "The withdrawal couldn't be started. Please try again.") };
  }

  const done = { receive: quote.receive, facilit8Fee: quote.facilit8Fee, transferFee: quote.transferFee };

  try {
    const transfer = await initiateTransfer({
      amountNaira: quote.receive,
      recipientCode: user.paystackRecipientCode,
      reason: "Withdrawal via Facilit8",
      reference,
    });
    await prisma.transaction.update({ where: { reference }, data: { paystackTransferCode: transfer.transferCode } });

    if (transfer.status === "OTP") {
      // "Confirm transfers before sending" is on in the Paystack dashboard, so no API transfer can ever
      // go through. Hand the money back and say so loudly: this is a setup problem, not the user's.
      console.error("Paystack asked for an OTP on a transfer: turn OFF 'Confirm transfers before sending' in the dashboard.");
      await applyTransferOutcome(reference, "FAILED");
      return { success: false, error: UNAVAILABLE };
    }

    const applied = await applyTransferOutcome(reference, transfer.status);
    if (applied === "released") return { success: false, error: "Your bank couldn't process this withdrawal. You haven't been charged." };
    return { success: true, ...done, pending: applied !== "settled" };
  } catch (err) {
    if (isDefinitiveFailure(err)) {
      // Paystack clearly refused (Facilit8's own balance too low, an invalid recipient...): nothing was sent.
      // Its wording is about OUR account ("Your balance is not enough"), which would read to the user as
      // their wallet being short, so it goes to the log and the user gets a plain account of what happened.
      console.error(`Paystack refused withdrawal ${reference}: ${describePaystackError(err)}`);
      await applyTransferOutcome(reference, "FAILED");
      return { success: false, error: "We couldn't send this withdrawal right now. You haven't been charged. Please try again later." };
    }
    // We can't know whether it arrived. Leave the money held; the reconciliation job will find out.
    console.error(`Could not confirm whether Paystack received withdrawal ${reference}; leaving it pending:`, err);
    return { success: true, ...done, pending: true };
  }
}
