import type { JournalLeg } from "./ledger.service";

/**
 * How each kind of money movement is written as ledger legs. Pure functions, kept apart from the
 * database code so the accounting — the part that must never be wrong — can be tested on its own.
 * Every function returns legs that sum to exactly zero (see journals.test.ts).
 *
 * Reading the signs: a positive leg credits an account, a negative leg debits it. A wallet, escrow
 * and revenue are all "money Facilit8 holds"; EXTERNAL is the outside world, so a deposit makes it
 * go negative (the world handed money in) and a withdrawal moves it back up.
 */

const positive = (name: string, value: number) => {
  if (!(value > 0)) throw new RangeError(`${name} must be greater than zero (got ${value}).`);
};

/**
 * Money arrived in a user's Paystack virtual account. The user is credited what they SENT
 * (`gross`); Paystack keeps its fee out of what reaches Facilit8's balance, so the pool only
 * receives `gross - paystackFee` and the difference is Facilit8's cost of taking deposits.
 */
export function depositLegs(input: { userId: string; gross: number; paystackFee: number }): JournalLeg[] {
  positive("gross", input.gross);
  if (input.paystackFee < 0 || input.paystackFee >= input.gross) throw new RangeError("Paystack's fee must be between 0 and the deposit.");
  const legs: JournalLeg[] = [
    { account: "external", amount: -(input.gross - input.paystackFee) },
    { account: `user:${input.userId}`, amount: input.gross },
  ];
  if (input.paystackFee > 0) legs.push({ account: "paystack_fees", amount: -input.paystackFee });
  return legs;
}

/** An Event Manager (or a merged-training participant) pays into escrow. */
export function fundingLegs(userId: string, amount: number): JournalLeg[] {
  positive("amount", amount);
  return [
    { account: `user:${userId}`, amount: -amount },
    { account: "escrow", amount },
  ];
}

/**
 * Escrow pays facilitators out and keeps `fee` as Facilit8's revenue. `payees` carry the NET
 * amounts, so what leaves escrow is their sum plus the fee — i.e. the gross that was funded.
 */
export function payoutLegs(input: { payees: { userId: string; amount: number }[]; fee: number }): JournalLeg[] {
  if (input.payees.length === 0) throw new RangeError("A payout needs at least one payee.");
  if (input.fee < 0) throw new RangeError("The fee can't be negative.");
  const net = input.payees.reduce((sum, payee) => sum + payee.amount, 0);
  positive("payout", net);

  // Payees can repeat (a split where one person is listed twice); the ledger nets them anyway.
  const legs: JournalLeg[] = [{ account: "escrow", amount: -(Math.round(net * 100) + Math.round(input.fee * 100)) / 100 }];
  for (const payee of input.payees) {
    positive("payee amount", payee.amount);
    legs.push({ account: `user:${payee.userId}`, amount: payee.amount });
  }
  if (input.fee > 0) legs.push({ account: "revenue", amount: input.fee });
  return legs;
}

/** Escrow returns money to the person who funded it (a resolved dispute). */
export function refundLegs(userId: string, amount: number): JournalLeg[] {
  positive("amount", amount);
  return [
    { account: "escrow", amount: -amount },
    { account: `user:${userId}`, amount },
  ];
}

/** A user pays Facilit8 directly for something it sells: a chat unlock, an Awe subscription. */
export function chargeLegs(userId: string, amount: number): JournalLeg[] {
  positive("amount", amount);
  return [
    { account: `user:${userId}`, amount: -amount },
    { account: "revenue", amount },
  ];
}

/** A withdrawal begins: the whole debit leaves the wallet at once and waits in TRANSFERS_PENDING. */
export function withdrawalHoldLegs(userId: string, debit: number): JournalLeg[] {
  positive("debit", debit);
  return [
    { account: `user:${userId}`, amount: -debit },
    { account: "transfers_pending", amount: debit },
  ];
}

/**
 * Paystack confirmed the transfer. The debit splits three ways: Facilit8's fee becomes revenue,
 * and what actually left Paystack's balance (the bank's amount plus Paystack's own transfer fee)
 * goes to EXTERNAL.
 */
export function withdrawalSettleLegs(input: { debit: number; facilit8Fee: number; transferred: number }): JournalLeg[] {
  positive("debit", input.debit);
  positive("transferred", input.transferred);
  if (input.facilit8Fee < 0) throw new RangeError("The fee can't be negative.");
  if (Math.round((input.facilit8Fee + input.transferred) * 100) !== Math.round(input.debit * 100)) {
    throw new RangeError("A withdrawal's fee plus what was transferred must equal what was debited.");
  }
  const legs: JournalLeg[] = [
    { account: "transfers_pending", amount: -input.debit },
    { account: "external", amount: input.transferred },
  ];
  if (input.facilit8Fee > 0) legs.push({ account: "revenue", amount: input.facilit8Fee });
  return legs;
}

/** The transfer failed or never happened: the held money goes back to the user. */
export function withdrawalReleaseLegs(userId: string, debit: number): JournalLeg[] {
  positive("debit", debit);
  return [
    { account: "transfers_pending", amount: -debit },
    { account: `user:${userId}`, amount: debit },
  ];
}

/** A transfer that had already settled was reversed by Paystack: undo the settlement in full. */
export function withdrawalReversalLegs(input: { userId: string; debit: number; facilit8Fee: number; transferred: number }): JournalLeg[] {
  positive("debit", input.debit);
  positive("transferred", input.transferred);
  const legs: JournalLeg[] = [
    { account: "external", amount: -input.transferred },
    { account: `user:${input.userId}`, amount: input.debit },
  ];
  if (input.facilit8Fee > 0) legs.push({ account: "revenue", amount: -input.facilit8Fee });
  return legs;
}
