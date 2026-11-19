import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import type { LedgerJournalType, WalletAccountKind } from "@/lib/generated/prisma/client";

/**
 * The wallet ledger. Paystack holds one pooled balance for the whole business and has no notion
 * of per-user wallets, so each user's wallet is an account here and every movement of money is a
 * JOURNAL: a set of signed legs that sum to exactly zero. That makes three things true by
 * construction, and verifyLedgerIntegrity() checks all of them:
 *
 *   - the total across every account is always 0 (money only moves, never appears);
 *   - an account's balance always equals the sum of its entries;
 *   - no wallet can go below zero (also enforced by a CHECK constraint in the database).
 *
 * Accounts (see WalletAccountKind): a wallet per user, plus ESCROW (event money awaiting payout),
 * REVENUE (Facilit8's income), TRANSFERS_PENDING (withdrawals Paystack hasn't confirmed),
 * PAYSTACK_FEES (unused today: users bear every Paystack fee, so Facilit8 books none; the account is
 * kept so a cost Facilit8 does carry could be recorded without a migration) and EXTERNAL (the outside world).
 */

export const SYSTEM_ACCOUNTS = {
  escrow: { kind: "ESCROW", mayBeNegative: false },
  revenue: { kind: "REVENUE", mayBeNegative: false },
  transfers_pending: { kind: "TRANSFERS_PENDING", mayBeNegative: false },
  paystack_fees: { kind: "PAYSTACK_FEES", mayBeNegative: true },
  external: { kind: "EXTERNAL", mayBeNegative: true },
} as const satisfies Record<string, { kind: WalletAccountKind; mayBeNegative: boolean }>;

export type SystemAccountCode = keyof typeof SYSTEM_ACCOUNTS;

export const userAccount = (userId: string) => `user:${userId}`;

export class LedgerError extends Error {}

export class InsufficientFundsError extends LedgerError {
  constructor(
    public readonly accountCode: string,
    public readonly available: number,
    public readonly needed: number
  ) {
    super(`Insufficient funds in ${accountCode}: ₦${available.toLocaleString("en-NG")} available, ₦${needed.toLocaleString("en-NG")} needed.`);
  }
}

type Db = Prisma.TransactionClient;

export const toKobo = (naira: number): number => Math.round(naira * 100);
const fromKobo = (kobo: number): string => (kobo / 100).toFixed(2);

export interface JournalLeg {
  /** An account code: "user:<id>" or a SystemAccountCode. */
  account: string;
  /** Signed naira: positive credits the account, negative debits it. */
  amount: number;
}

export interface PostJournalInput {
  /** Idempotency key. Posting the same reference again does nothing and reports created: false. */
  reference: string;
  type: LedgerJournalType;
  description?: string;
  metadata?: Prisma.InputJsonValue;
  legs: JournalLeg[];
}

export interface PostJournalResult {
  created: boolean;
  journalId: string;
}

function accountSpec(code: string): { kind: WalletAccountKind; userId: string | null; mayBeNegative: boolean } {
  if (code.startsWith("user:")) {
    const userId = code.slice("user:".length);
    if (!userId) throw new LedgerError(`Malformed account code "${code}".`);
    return { kind: "USER", userId, mayBeNegative: false };
  }
  const system = SYSTEM_ACCOUNTS[code as SystemAccountCode];
  if (!system) throw new LedgerError(`Unknown ledger account "${code}".`);
  return { kind: system.kind, userId: null, mayBeNegative: system.mayBeNegative };
}

function validate(input: PostJournalInput): Map<string, number> {
  if (!input.reference || input.reference.length > 120) throw new LedgerError("A journal needs a reference of 1-120 characters.");
  if (input.legs.length < 2) throw new LedgerError("A journal needs at least two legs.");

  const net = new Map<string, number>();
  let sum = 0;
  for (const leg of input.legs) {
    if (!Number.isFinite(leg.amount)) throw new LedgerError(`Non-numeric amount on ${leg.account}.`);
    const kobo = toKobo(leg.amount);
    if (Math.abs(leg.amount * 100 - kobo) > 1e-6) throw new LedgerError(`${leg.amount} has more than two decimal places.`);
    if (kobo === 0) throw new LedgerError(`A zero leg on ${leg.account} — leave it out.`);
    accountSpec(leg.account); // throws on an unknown account
    sum += kobo;
    net.set(leg.account, (net.get(leg.account) ?? 0) + kobo);
  }
  if (sum !== 0) throw new LedgerError(`Journal ${input.reference} is unbalanced by ₦${(sum / 100).toFixed(2)}.`);
  return net;
}

/** Creates the account row if it doesn't exist. ON CONFLICT so concurrent first uses can't collide. */
async function ensureAccountRow(db: Db, code: string): Promise<void> {
  const spec = accountSpec(code);
  await db.$executeRaw`
    INSERT INTO "WalletAccount" (id, code, kind, "userId", balance, "updatedAt")
    VALUES (${randomUUID()}, ${code}, ${spec.kind}::"WalletAccountKind", ${spec.userId}, 0, now())
    ON CONFLICT (code) DO NOTHING`;
}

async function postInTransaction(db: Db, input: PostJournalInput, net: Map<string, number>): Promise<PostJournalResult> {
  const existing = await db.ledgerJournal.findUnique({ where: { reference: input.reference }, select: { id: true } });
  if (existing) return { created: false, journalId: existing.id };

  // Locked in code order, always, so two journals touching the same accounts can't deadlock.
  const codes = [...net.keys()].sort();
  for (const code of codes) await ensureAccountRow(db, code);

  const rows = await db.$queryRaw<{ id: string; code: string; balance: string }[]>`
    SELECT id, code, balance::text AS balance FROM "WalletAccount"
    WHERE code IN (${Prisma.join(codes)}) ORDER BY code FOR UPDATE`;

  const plan = rows.map((row) => {
    const delta = net.get(row.code)!;
    const before = toKobo(Number(row.balance));
    const after = before + delta;
    if (after < 0 && !accountSpec(row.code).mayBeNegative) {
      throw new InsufficientFundsError(row.code, before / 100, -delta / 100);
    }
    return { id: row.id, delta, after };
  });

  const journal = await db.ledgerJournal.create({
    data: { reference: input.reference, type: input.type, description: input.description, metadata: input.metadata },
    select: { id: true },
  });

  for (const step of plan) {
    if (step.delta === 0) continue;
    await db.walletAccount.update({ where: { id: step.id }, data: { balance: fromKobo(step.after) } });
    await db.ledgerEntry.create({
      data: { journalId: journal.id, accountId: step.id, amount: fromKobo(step.delta), balanceAfter: fromKobo(step.after) },
    });
  }
  return { created: true, journalId: journal.id };
}

/**
 * Every operation that moves money runs in one of these. Two things differ from Prisma's
 * defaults, both for bursts: a caller may have to wait for its turn on a hot account's row lock
 * (a wallet being charged from several places at once), and for a pooled database connection
 * while it waits. Prisma's 2-second default for the latter turned a busy moment into an
 * "Unable to start a transaction" error for users, so it waits up to 10 seconds instead.
 */
export function inLedgerTransaction<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  return prisma.$transaction(fn, { maxWait: 10_000, timeout: 20_000 });
}

/**
 * Posts a balanced journal atomically. Pass `tx` to make the money movement part of a larger
 * database transaction (the usual case: the journal, the user-facing Transaction row and the
 * domain update — "event funded", "payout recorded" — then commit or roll back together, so there
 * is no state where money moved but the app doesn't know why). Without `tx` it runs in its own.
 *
 * Throws InsufficientFundsError if any non-negative account would go below zero.
 */
export async function postJournal(input: PostJournalInput, tx?: Db): Promise<PostJournalResult> {
  const net = validate(input);
  if (tx) return postInTransaction(tx, input, net);

  try {
    return await inLedgerTransaction((db) => postInTransaction(db, input, net));
  } catch (err) {
    // Two callers racing on the same reference: the loser hits the unique index. The journal exists,
    // which is exactly what "already posted" means.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.ledgerJournal.findUnique({ where: { reference: input.reference }, select: { id: true } });
      if (existing) return { created: false, journalId: existing.id };
    }
    throw err;
  }
}

/** Ensures a user's wallet account exists and returns its id (what User.depositAccountId holds). */
export async function ensureUserWallet(userId: string, db: Db | typeof prisma = prisma): Promise<string> {
  await ensureAccountRow(db as Db, userAccount(userId));
  const account = await db.walletAccount.findUniqueOrThrow({ where: { code: userAccount(userId) }, select: { id: true } });
  return account.id;
}

export async function getAccountBalance(code: string): Promise<number> {
  const account = await prisma.walletAccount.findUnique({ where: { code }, select: { balance: true } });
  return account ? Number(account.balance) : 0;
}

export const getUserBalance = (userId: string) => getAccountBalance(userAccount(userId));

export interface LedgerIntegrityReport {
  ok: boolean;
  issues: string[];
}

/**
 * Proves the books are consistent. Cheap enough to run from the admin page and from tests; any
 * issue here means a bug or someone editing balances by hand, and is worth stopping to look at.
 */
export async function verifyLedgerIntegrity(): Promise<LedgerIntegrityReport> {
  const issues: string[] = [];

  const [{ total }] = await prisma.$queryRaw<{ total: string }[]>`SELECT COALESCE(SUM(balance), 0)::text AS total FROM "WalletAccount"`;
  if (Number(total) !== 0) issues.push(`Account balances sum to ₦${total}, not zero.`);

  const drifted = await prisma.$queryRaw<{ code: string; balance: string; entries: string }[]>`
    SELECT a.code, a.balance::text AS balance, COALESCE(SUM(e.amount), 0)::text AS entries
    FROM "WalletAccount" a LEFT JOIN "LedgerEntry" e ON e."accountId" = a.id
    GROUP BY a.id HAVING a.balance <> COALESCE(SUM(e.amount), 0)`;
  for (const row of drifted) issues.push(`${row.code}: balance ₦${row.balance} but its entries add up to ₦${row.entries}.`);

  const unbalanced = await prisma.$queryRaw<{ reference: string; sum: string }[]>`
    SELECT j.reference, SUM(e.amount)::text AS sum
    FROM "LedgerJournal" j JOIN "LedgerEntry" e ON e."journalId" = j.id
    GROUP BY j.id HAVING SUM(e.amount) <> 0`;
  for (const row of unbalanced) issues.push(`Journal ${row.reference} is unbalanced by ₦${row.sum}.`);

  return { ok: issues.length === 0, issues };
}

export interface LedgerSummary {
  userWallets: number;
  escrow: number;
  transfersPending: number;
  /** Everything Facilit8 owes people right now: wallets + escrow + withdrawals in flight. */
  liabilities: number;
  revenue: number;
  /** What Paystack's own balance should be, per the ledger: money in minus money out. */
  expectedPaystackBalance: number;
}

export async function getLedgerSummary(): Promise<LedgerSummary> {
  const rows = await prisma.walletAccount.groupBy({ by: ["kind"], _sum: { balance: true } });
  const sum = (kind: WalletAccountKind) => Number(rows.find((r) => r.kind === kind)?._sum.balance ?? 0);

  // `0 - x` rather than `-x`: negating a zero total gives -0, which prints as "₦-0.00".
  const negate = (value: number) => 0 - value;

  const userWallets = sum("USER");
  const escrow = sum("ESCROW");
  const transfersPending = sum("TRANSFERS_PENDING");
  return {
    userWallets,
    escrow,
    transfersPending,
    liabilities: userWallets + escrow + transfersPending,
    revenue: sum("REVENUE"),
    expectedPaystackBalance: negate(sum("EXTERNAL")),
  };
}
