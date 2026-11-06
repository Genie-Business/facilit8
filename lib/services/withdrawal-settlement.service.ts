import { prisma } from "@/lib/db";
import type { Prisma } from "@/lib/generated/prisma/client";
import { bookTransfer, verifyTransfer } from "@/lib/anchor/transfers";
import { describeAnchorError } from "@/lib/anchor/types";

/**
 * A withdrawal moves money twice out of the user's wallet: the net amount to their bank (NIP),
 * and the withdrawal fee to the platform settlement account (a book transfer). This file owns
 * the second half and everything that has to happen once Anchor has confirmed the first.
 *
 * Why it isn't done inline: NIP transfers take seconds to settle (production shows "initiated"
 * and "successful" webhooks about 12s apart), so at request time a withdrawal is nearly always
 * still PENDING. The fee is only taken once the payout is confirmed — a user must never pay a
 * fee for a withdrawal that then fails — and confirmation arrives later, from the webhook or
 * the scheduled reconciliation. Both call settleWithdrawal(), which is safe to run any number
 * of times and from several places at once.
 */

export type FeeStatus = "NONE" | "PENDING" | "COLLECTING" | "COLLECTED" | "FAILED";

export interface WithdrawalFeeMeta {
  status: FeeStatus;
  transferId?: string;
  reference?: string;
  error?: string;
  collectedAt?: string;
}

export function feeMetadata(fee: WithdrawalFeeMeta): Prisma.InputJsonValue {
  return { fee: { ...fee } };
}

export type TransferOutcome = "SUCCESS" | "FAILED" | "REVERSED" | "PENDING";

/** Anchor's transfer status, normalised. Anything unrecognised is treated as still in flight. */
export function classifyTransferStatus(status: string): TransferOutcome {
  const normalised = status.toLowerCase();
  if (normalised === "successful" || normalised === "completed") return "SUCCESS";
  if (normalised === "failed") return "FAILED";
  if (normalised === "reversed") return "REVERSED";
  return "PENDING";
}

export type SettleOutcome =
  | "not_found"
  | "no_transfer"
  | "still_pending"
  | "failed"
  | "reversed"
  | "success_no_fee"
  | "fee_collected"
  | "fee_failed"
  | "already_handled";

type WithdrawalRow = Prisma.TransactionGetPayload<{ include: { user: { select: { depositAccountId: true } } } }>;

function currentFeeStatus(metadata: Prisma.JsonValue | null): FeeStatus | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const fee = (metadata as { fee?: { status?: FeeStatus } }).fee;
  return fee?.status ?? null;
}

/**
 * Brings one withdrawal up to date with Anchor: confirms the payout if it was still pending and,
 * once it's confirmed, collects the fee. Idempotent — the status change and the fee claim are
 * both conditional updates, so two callers at once can't double-charge.
 */
export async function settleWithdrawal(transactionId: string): Promise<SettleOutcome> {
  const tx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { user: { select: { depositAccountId: true } } },
  });
  if (!tx || tx.type !== "WITHDRAWAL") return "not_found";

  if (tx.status === "FAILED") return "failed";
  if (tx.status === "REVERSED") return "reversed";

  if (tx.status === "PENDING") {
    if (!tx.anchorTransferId) return "no_transfer";

    const outcome = classifyTransferStatus(await verifyTransfer(tx.anchorTransferId));
    if (outcome === "PENDING") return "still_pending";

    const moved = await prisma.transaction.updateMany({ where: { id: tx.id, status: "PENDING" }, data: { status: outcome } });
    if (moved.count === 0) return "already_handled"; // another caller settled it first, and will take the fee
    if (outcome === "FAILED") return "failed";
    if (outcome === "REVERSED") return "reversed";
  }

  return collectFee(tx);
}

async function collectFee(tx: WithdrawalRow): Promise<SettleOutcome> {
  const fee = Number(tx.feeAmount ?? 0);
  const status = currentFeeStatus(tx.metadata);

  // Rows from before fees were collected carry a recorded feeAmount but no fee metadata, and
  // that fee was never charged — it must not be taken retroactively.
  if (fee <= 0 || status === null || status === "NONE") return "success_no_fee";
  if (status !== "PENDING") return "already_handled";

  const claim = await prisma.transaction.updateMany({
    where: { id: tx.id, metadata: { path: ["fee", "status"], equals: "PENDING" } },
    data: { metadata: feeMetadata({ status: "COLLECTING" }) },
  });
  if (claim.count !== 1) return "already_handled";

  const reference = `${tx.reference}_fee`;
  try {
    const settlementAccountId = process.env.ANCHOR_SETTLEMENT_ACCOUNT_ID;
    if (!settlementAccountId || !tx.user.depositAccountId) {
      throw new Error("The settlement account or the user's wallet isn't configured.");
    }

    const { transferId } = await bookTransfer({
      sourceAccountId: tx.user.depositAccountId,
      destinationAccountId: settlementAccountId,
      amountNaira: fee,
      reason: "Withdrawal fee via Facilit8",
      reference,
    });
    const transferStatus = classifyTransferStatus(await verifyTransfer(transferId));
    if (transferStatus !== "SUCCESS") {
      throw new Error(`Fee transfer not successful, status: ${transferStatus.toLowerCase()}`);
    }

    await prisma.transaction.update({
      where: { id: tx.id },
      data: { metadata: feeMetadata({ status: "COLLECTED", transferId, reference, collectedAt: new Date().toISOString() }) },
    });
    return "fee_collected";
  } catch (err) {
    // Deliberately NOT retried automatically: after an ambiguous failure (a timeout, say) the
    // transfer may really have happened, and trying again would charge the user twice. A failed
    // collection is surfaced on the admin analytics page for a person to look at.
    console.error(`Withdrawal fee collection failed for transaction ${tx.id}:`, err);
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { metadata: feeMetadata({ status: "FAILED", reference, error: describeAnchorError(err) }) },
    });
    return "fee_failed";
  }
}

const MAX_PER_RUN = 50;
const RECENTLY_CREATED_MS = 30_000; // leave a withdrawal still being created by its own request alone
const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Scheduled safety net: settles withdrawals whose confirmation never arrived by webhook (or
 * whose fee was never attempted), so a missed or malformed webhook delays a withdrawal's status
 * and fee by at most one cron interval instead of losing them.
 */
export async function reconcileWithdrawals(now = new Date()): Promise<{
  withdrawalsChecked: number;
  feesCollected: number;
  feesFailed: number;
  stillPending: number;
}> {
  const candidates = await prisma.transaction.findMany({
    where: {
      type: "WITHDRAWAL",
      OR: [
        {
          status: "PENDING",
          anchorTransferId: { not: null },
          createdAt: { gt: new Date(now.getTime() - LOOKBACK_MS), lt: new Date(now.getTime() - RECENTLY_CREATED_MS) },
        },
        { status: "SUCCESS", metadata: { path: ["fee", "status"], equals: "PENDING" } },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: MAX_PER_RUN,
    select: { id: true },
  });

  const result = { withdrawalsChecked: candidates.length, feesCollected: 0, feesFailed: 0, stillPending: 0 };
  for (const { id } of candidates) {
    try {
      const outcome = await settleWithdrawal(id);
      if (outcome === "fee_collected") result.feesCollected++;
      else if (outcome === "fee_failed") result.feesFailed++;
      else if (outcome === "still_pending") result.stillPending++;
    } catch (err) {
      // One bad transfer lookup must not stop the rest of the batch.
      console.error(`Withdrawal reconciliation failed for transaction ${id}:`, err);
    }
  }
  return result;
}
