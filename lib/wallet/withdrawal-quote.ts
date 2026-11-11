import { calculateCappedFee } from "../services/payout-math";
import { MIN_WITHDRAWAL_RECEIVE, paystackTransferFee } from "../paystack/transfer-fees";

// Pure and free of server imports on purpose: the withdraw form calls this in the browser to show
// the fees, and the server calls the very same function to charge them, so the two can't disagree.

export interface WithdrawalFeeSchedule {
  /** Facilit8's own withdrawal fee: a percentage of the amount withdrawn... */
  percentage: number;
  /** ...capped at this many naira (null = uncapped). */
  maxAmount: number | null;
}

export interface WithdrawalQuote {
  /** What lands in the user's bank account: exactly the amount they asked to withdraw. */
  receive: number;
  /** Facilit8's fee, worked out on `receive`. */
  facilit8Fee: number;
  /** Paystack's transfer fee (including stamp duty), passed through to the user. */
  transferFee: number;
  /** What leaves the wallet: receive + both fees. The user can only withdraw if this is within their balance. */
  debit: number;
}

export type WithdrawalQuoteResult = { ok: true; quote: WithdrawalQuote } | { ok: false; reason: "too_small" };

const kobo = (naira: number) => Math.round(naira * 100);

/**
 * The cost of sending `amount` to the user's bank. The user bears every fee, on top of the amount:
 * they ask to withdraw ₦X, ₦X reaches their bank, and ₦X plus Facilit8's fee plus Paystack's transfer
 * fee leaves their wallet. If that total is more than their balance, they can't withdraw it.
 */
export function quoteWithdrawal(amount: number, schedule: WithdrawalFeeSchedule): WithdrawalQuoteResult {
  const receive = kobo(amount) / 100;
  if (!(receive >= MIN_WITHDRAWAL_RECEIVE)) return { ok: false, reason: "too_small" };

  const facilit8Fee = calculateCappedFee(receive, schedule.percentage, schedule.maxAmount);
  const transferFee = paystackTransferFee(receive);
  return {
    ok: true,
    quote: { receive, facilit8Fee, transferFee, debit: (kobo(receive) + kobo(facilit8Fee) + kobo(transferFee)) / 100 },
  };
}

/**
 * The most a user with `balance` can withdraw, i.e. the largest amount whose total cost (amount plus
 * both fees) still fits in the balance. Fees are added on top, so this is a little less than the
 * balance; it is what lets someone empty their wallet without guessing. 0 if even the smallest
 * withdrawal would cost more than they have.
 */
export function maxWithdrawable(balance: number, schedule: WithdrawalFeeSchedule): number {
  const budget = kobo(balance);
  // The total cost rises with the amount (the percentage fee and Paystack's tiers never fall), so the
  // largest amount that still fits can be found by halving the range.
  const cost = (receiveKobo: number) => {
    const receive = receiveKobo / 100;
    return receiveKobo + kobo(calculateCappedFee(receive, schedule.percentage, schedule.maxAmount)) + kobo(paystackTransferFee(receive));
  };

  let low = 0;
  let high = budget;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (cost(mid) <= budget) low = mid;
    else high = mid - 1;
  }
  return low >= kobo(MIN_WITHDRAWAL_RECEIVE) ? low / 100 : 0;
}
