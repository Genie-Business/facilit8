/**
 * What Paystack charges Facilit8 to send a transfer out of its balance, in naira. Users bear this
 * (it is shown to them before they confirm and added to their withdrawal), on top of Facilit8's
 * own withdrawal fee.
 *
 * From Paystack's published pricing for NGN transfers (support.paystack.com, "Transfers pricing"
 * and "Stamp Duty Charge on NGN Transfers"): ₦10 up to ₦5,000, ₦25 up to ₦50,000, ₦50 above that,
 * and a ₦50 government stamp duty on transfers of ₦10,000 or more (from 18 Feb 2026), charged on
 * top. These are constants in code on purpose: if Paystack changes its pricing, this is the one
 * place to update — and the withdrawal screen reads from it, so users always see the real figure.
 */
export const TRANSFER_FEE_TIERS = [
  { upTo: 5_000, fee: 10 },
  { upTo: 50_000, fee: 25 },
  { upTo: Infinity, fee: 50 },
] as const;

export const STAMP_DUTY_THRESHOLD = 10_000;
export const STAMP_DUTY = 50;

/** The smallest amount a user can have sent to their bank (our own floor; a sanity limit). */
export const MIN_WITHDRAWAL_RECEIVE = 100;

export function paystackTransferFee(transferAmount: number): number {
  const tier = TRANSFER_FEE_TIERS.find((candidate) => transferAmount <= candidate.upTo)!;
  return tier.fee + (transferAmount >= STAMP_DUTY_THRESHOLD ? STAMP_DUTY : 0);
}
