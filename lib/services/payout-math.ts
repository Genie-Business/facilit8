/**
 * Pure money-math extracted out of fee.service.ts and payout.service.ts so it's testable
 * without a live DB or Anchor API call. Behavior must stay byte-for-byte identical to what
 * those services inline before this extraction.
 */

export function calculateFeeAmount(grossAmount: number, feePercentage: number): number {
  return grossAmount * (feePercentage / 100);
}

/**
 * Splits netAmount evenly across `count` payees to kobo precision (2 decimal places), with
 * the rounding remainder going to the first payee so shares always sum exactly to netAmount.
 * Returns an empty array for count <= 0.
 *
 * The first payee's share is re-rounded after adding the remainder: baseShare and remainder
 * are each already 2-decimal-clean individually, but IEEE-754 addition of two such floats
 * can still drift (33.33 + 0.01 = 33.339999999999996, not 33.34) — this was a real latent
 * bug in the original inline version of this logic before it was extracted here.
 */
export function splitNetAmount(netAmount: number, count: number): number[] {
  if (count <= 0) return [];
  const baseShare = Math.floor((netAmount / count) * 100) / 100;
  const remainder = Math.round((netAmount - baseShare * count) * 100) / 100;
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? Math.round((baseShare + remainder) * 100) / 100 : baseShare
  );
}
