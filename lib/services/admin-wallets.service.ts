import { prisma } from "@/lib/db";
import { getLedgerSummary, verifyLedgerIntegrity } from "@/lib/ledger/ledger.service";
import { getPaystackBalance } from "@/lib/paystack/api";
import { isPaystackConfigured } from "@/lib/paystack/client";

/**
 * Everything an admin needs to tell whether the wallet system is healthy, on one page:
 *  - the ledger's own totals (what Facilit8 owes users and holds in escrow, and what it has earned);
 *  - what Paystack's balance SHOULD be per the ledger next to what it actually is. A gap that doesn't
 *    close means money moved that the ledger doesn't know about, or the other way round. A small,
 *    temporary gap is normal: a deposit is credited the moment Paystack announces it, a little before
 *    it settles into the balance;
 *  - the ledger's integrity check (every journal balances, every account equals its entries);
 *  - withdrawals that have been waiting on Paystack for too long.
 */

const STUCK_AFTER_MS = 60 * 60 * 1000;

export async function getWalletsOverview() {
  const [summary, integrity, paystackBalance, stuckWithdrawals, recentJournals, withdrawalCounts] = await Promise.all([
    getLedgerSummary(),
    verifyLedgerIntegrity(),
    isPaystackConfigured() ? getPaystackBalance() : Promise.resolve(null),
    prisma.transaction.findMany({
      where: { type: "WITHDRAWAL", status: "PENDING", createdAt: { lt: new Date(Date.now() - STUCK_AFTER_MS) } },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
    }),
    prisma.ledgerJournal.findMany({ orderBy: { createdAt: "desc" }, take: 15, select: { id: true, reference: true, type: true, description: true, createdAt: true } }),
    prisma.transaction.groupBy({ by: ["status"], where: { type: "WITHDRAWAL" }, _count: { _all: true } }),
  ]);

  return {
    summary,
    integrity,
    paystackConfigured: isPaystackConfigured(),
    /** null when Paystack can't be reached (or isn't set up): the page says so instead of guessing. */
    paystackBalance,
    difference: paystackBalance === null ? null : Math.round((paystackBalance - summary.expectedPaystackBalance) * 100) / 100,
    stuckWithdrawals,
    recentJournals,
    withdrawalCounts: Object.fromEntries(withdrawalCounts.map((row) => [row.status, row._count._all])) as Record<string, number>,
  };
}
