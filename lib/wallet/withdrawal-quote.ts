import { calculateCappedFee } from "../services/payout-math";
import { MIN_WITHDRAWAL_RECEIVE, paystackTransferFee } from "../paystack/transfer-fees";

// Pure and free of server imports on purpose: the withdraw form calls this in the browser to show
// the fee, and the server calls the very same function to charge it, so the two can't disagree.

export interface WithdrawalFeeSchedule {
  /** Facilit8's own withdrawal fee: a percentage of the amount... */
  percentage: number;
  /** ...capped at this many naira (null = uncapped). */
  maxAmount: number | null;
}

export interface WithdrawalQuote {
  /** What the user typed in. */
  amount: number;
  /** Facilit8's fee. */
  facilit8Fee: number;
  /** Paystack's transfer fee (including stamp duty), passed through to the user. */
  transferFee: number;
  /** What lands in the user's bank account. */
  receive: number;
  /** What actually leaves the wallet: receive + both fees. At most `amount`. */
  debit: number;
}

export type WithdrawalQuoteResult = { ok: true; quote: WithdrawalQuote } | { ok: false; reason: "too_small" };

const kobo = (naira: number) => Math.round(naira * 100);

/**
 * Splits an amount into what reaches the bank and the two fees.
 *
 * `amount` is the most the user is willing to give up. Facilit8's fee comes off first; what is
 * left has to cover both the bank amount and Paystack's fee, which depends on the bank amount in
 * steps (₦10 / ₦25 / ₦50, plus stamp duty from ₦10,000). Because those steps leave gaps — no
 * transfer exists whose amount plus fee is exactly ₦5,011, say — we send the LARGEST amount that
 * fits and leave the few naira of slack in the wallet rather than charging for it. So `debit` can
 * be slightly less than `amount`, never more.
 */
export function quoteWithdrawal(amount: number, schedule: WithdrawalFeeSchedule): WithdrawalQuoteResult {
  const facilit8Fee = calculateCappedFee(amount, schedule.percentage, schedule.maxAmount);
  const budget = kobo(amount) - kobo(facilit8Fee);
  if (budget <= 0) return { ok: false, reason: "too_small" };

  // receive + transferFee(receive) rises with `receive`, so binary-search the largest that fits.
  const cost = (receiveKobo: number) => receiveKobo + kobo(paystackTransferFee(receiveKobo / 100));
  let low = 0;
  let high = budget;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (cost(mid) <= budget) low = mid;
    else high = mid - 1;
  }

  if (low < kobo(MIN_WITHDRAWAL_RECEIVE)) return { ok: false, reason: "too_small" };

  const receive = low / 100;
  const transferFee = paystackTransferFee(receive);
  return {
    ok: true,
    quote: {
      amount,
      facilit8Fee,
      transferFee,
      receive,
      debit: (kobo(receive) + kobo(transferFee) + kobo(facilit8Fee)) / 100,
    },
  };
}
