import { prisma } from "@/lib/db";
import { AlreadyDoneError } from "@/lib/ledger/errors";
import { inLedgerTransaction, postJournal } from "@/lib/ledger/ledger.service";
import { withdrawalReleaseLegs, withdrawalReversalLegs, withdrawalSettleLegs } from "@/lib/ledger/journals";
import { verifyTransfer } from "@/lib/paystack/api";
import { PaystackApiError } from "@/lib/paystack/client";
import type { TransferOutcome } from "@/lib/paystack/status";
import { createNotification } from "./notification.service";
import { roundKobo } from "./payout-math";

/**
 * What happens to a withdrawal after the user clicks the button.
 *
 * Starting one takes the whole debit out of the wallet at once (see withdrawal.service) and parks
 * it in TRANSFERS_PENDING. Paystack then reports how the transfer went, and that report — from a
 * webhook, from the immediate API response, or from the scheduled catch-up — is applied here, by
 * exactly one function, whichever way it arrives:
 *
 *   success  -> Facilit8's fee becomes revenue and the rest (the bank's amount + Paystack's own fee)
 *               leaves the pool;
 *   failed   -> the whole debit goes back to the user, fee included: a failed withdrawal costs nothing;
 *   reversed -> same as failed if the transfer was still pending, and if it had already been marked
 *               successful the settlement is undone and the user refunded in full.
 *
 * Every transition is claimed with a conditional update on the transaction's status inside the same
 * database transaction as its journal, so two reports of the same outcome (a webhook and the cron,
 * say) can never both apply.
 */

export type SettleOutcome = "settled" | "released" | "reversed" | "still_pending" | "already_handled" | "not_found";

const naira = (value: number) => `₦${value.toLocaleString("en-NG")}`;

type WithdrawalRow = NonNullable<Awaited<ReturnType<typeof findWithdrawal>>>;

function findWithdrawal(reference: string) {
  return prisma.transaction.findFirst({ where: { reference, type: "WITHDRAWAL" } });
}

/** Applies a transfer outcome to the withdrawal with this reference. Idempotent. */
export async function applyTransferOutcome(reference: string, outcome: TransferOutcome): Promise<SettleOutcome> {
  const tx = await findWithdrawal(reference);
  if (!tx) return "not_found";

  switch (outcome) {
    case "SUCCESS":
      return tx.status === "PENDING" ? settle(tx) : "already_handled";
    case "FAILED":
      return tx.status === "PENDING" ? release(tx, "FAILED") : "already_handled";
    case "REVERSED":
      if (tx.status === "PENDING") return release(tx, "REVERSED");
      if (tx.status === "SUCCESS") return reverseSettled(tx);
      return "already_handled";
    default:
      return "still_pending"; // OTP / PENDING: nothing to apply yet
  }
}

async function settle(tx: WithdrawalRow): Promise<SettleOutcome> {
  const debit = Number(tx.amount);
  const facilit8Fee = Number(tx.feeAmount ?? 0);
  try {
    await inLedgerTransaction(async (db) => {
      const claimed = await db.transaction.updateMany({ where: { id: tx.id, status: "PENDING" }, data: { status: "SUCCESS" } });
      if (claimed.count !== 1) throw new AlreadyDoneError("handled");
      await postJournal(
        {
          reference: `${tx.reference}:settle`,
          type: "WITHDRAWAL_SETTLE",
          description: "Withdrawal sent",
          legs: withdrawalSettleLegs({ debit, facilit8Fee, transferred: roundKobo(debit - facilit8Fee) }),
        },
        db
      );
    });
  } catch (err) {
    if (err instanceof AlreadyDoneError) return "already_handled";
    throw err;
  }

  await createNotification({
    userId: tx.userId,
    notificationType: "PAYMENT_CONFIRMED",
    message: `${naira(Number(tx.netAmount ?? 0))} has been sent to your bank account.`,
    link: "/wallet/transactions",
  });
  return "settled";
}

async function release(tx: WithdrawalRow, finalStatus: "FAILED" | "REVERSED"): Promise<SettleOutcome> {
  const debit = Number(tx.amount);
  try {
    await inLedgerTransaction(async (db) => {
      const claimed = await db.transaction.updateMany({ where: { id: tx.id, status: "PENDING" }, data: { status: finalStatus } });
      if (claimed.count !== 1) throw new AlreadyDoneError("handled");
      await postJournal(
        {
          reference: `${tx.reference}:release`,
          type: "WITHDRAWAL_RELEASE",
          description: "Withdrawal didn't go through",
          legs: withdrawalReleaseLegs(tx.userId, debit),
        },
        db
      );
    });
  } catch (err) {
    if (err instanceof AlreadyDoneError) return "already_handled";
    throw err;
  }

  await createNotification({
    userId: tx.userId,
    notificationType: "PAYMENT_CONFIRMED",
    message: `Your withdrawal didn't go through. ${naira(debit)} has been returned to your wallet.`,
    link: "/wallet",
  });
  return "released";
}

/** Paystack reversed a transfer we had already recorded as sent: undo it and refund the user in full. */
async function reverseSettled(tx: WithdrawalRow): Promise<SettleOutcome> {
  const debit = Number(tx.amount);
  const facilit8Fee = Number(tx.feeAmount ?? 0);
  try {
    await inLedgerTransaction(async (db) => {
      const claimed = await db.transaction.updateMany({ where: { id: tx.id, status: "SUCCESS" }, data: { status: "REVERSED" } });
      if (claimed.count !== 1) throw new AlreadyDoneError("handled");
      await postJournal(
        {
          reference: `${tx.reference}:reversal`,
          type: "WITHDRAWAL_REVERSAL",
          description: "Withdrawal reversed by Paystack",
          legs: withdrawalReversalLegs({ userId: tx.userId, debit, facilit8Fee, transferred: roundKobo(debit - facilit8Fee) }),
        },
        db
      );
    });
  } catch (err) {
    if (err instanceof AlreadyDoneError) return "already_handled";
    throw err;
  }

  await createNotification({
    userId: tx.userId,
    notificationType: "PAYMENT_CONFIRMED",
    message: `Your withdrawal was reversed by the bank. ${naira(debit)} has been returned to your wallet.`,
    link: "/wallet",
  });
  return "reversed";
}

const MAX_PER_RUN = 50;
const RECENTLY_CREATED_MS = 60_000; // leave a withdrawal that's still being started by its own request alone
const LOOKBACK_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Scheduled catch-up: asks Paystack about every withdrawal still PENDING after a minute and applies
 * the answer, so a missed or malformed webhook, or a request that died after Paystack accepted the
 * transfer, delays a withdrawal by at most one cron interval instead of stranding the money.
 *
 * Paystack saying "not found" (a 404 for our reference) means the transfer was never created — the
 * request that would have created it never arrived — so the held money is released back.
 */
export async function reconcileWithdrawals(now = new Date()): Promise<{ checked: number; settled: number; released: number; stillPending: number }> {
  const candidates = await prisma.transaction.findMany({
    where: {
      type: "WITHDRAWAL",
      status: "PENDING",
      createdAt: { gt: new Date(now.getTime() - LOOKBACK_MS), lt: new Date(now.getTime() - RECENTLY_CREATED_MS) },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_PER_RUN,
    select: { reference: true },
  });

  const result = { checked: candidates.length, settled: 0, released: 0, stillPending: 0 };
  for (const { reference } of candidates) {
    try {
      let outcome: TransferOutcome;
      try {
        outcome = (await verifyTransfer(reference)).status;
      } catch (err) {
        if (err instanceof PaystackApiError && err.kind === "api" && err.status === 404) outcome = "FAILED";
        else throw err;
      }
      const applied = await applyTransferOutcome(reference, outcome);
      if (applied === "settled") result.settled++;
      else if (applied === "released" || applied === "reversed") result.released++;
      else if (applied === "still_pending") result.stillPending++;
    } catch (err) {
      // One bad lookup must not stop the rest of the batch; it will be retried next run.
      console.error(`Withdrawal reconciliation failed for ${reference}:`, err);
    }
  }
  return result;
}
