import { describe, expect, it } from "vitest";
import { calculateFeeAmount, splitNetAmount } from "./payout-math";

describe("calculateFeeAmount", () => {
  it("computes a percentage of the gross amount", () => {
    expect(calculateFeeAmount(100_000, 10)).toBe(10_000);
  });

  it("returns 0 for a 0% fee", () => {
    expect(calculateFeeAmount(100_000, 0)).toBe(0);
  });

  it("handles non-round percentages without drifting", () => {
    expect(calculateFeeAmount(50_000, 7.5)).toBeCloseTo(3_750, 5);
  });
});

describe("splitNetAmount", () => {
  it("returns an empty array for zero or negative payee counts", () => {
    expect(splitNetAmount(1000, 0)).toEqual([]);
    expect(splitNetAmount(1000, -1)).toEqual([]);
  });

  it("gives the full amount to a single payee", () => {
    expect(splitNetAmount(95_000, 1)).toEqual([95_000]);
  });

  it("splits evenly when the amount divides cleanly", () => {
    expect(splitNetAmount(300, 3)).toEqual([100, 100, 100]);
  });

  it("routes the rounding remainder to the first payee so shares sum exactly to netAmount", () => {
    const shares = splitNetAmount(100, 3);
    // 100 / 3 = 33.333..., floored to kobo precision each payee gets 33.33, remainder 0.01 to payee 0
    expect(shares).toEqual([33.34, 33.33, 33.33]);
    expect(shares.reduce((sum, s) => sum + s, 0)).toBeCloseTo(100, 5);
  });

  it("sums to netAmount for an uneven split across many payees", () => {
    const netAmount = 987_654.32;
    const count = 7;
    const shares = splitNetAmount(netAmount, count);
    expect(shares).toHaveLength(count);
    const total = shares.reduce((sum, s) => sum + s, 0);
    expect(Math.round(total * 100) / 100).toBe(netAmount);
  });

  it("never lets a non-first payee's share exceed the base (floored) share", () => {
    const shares = splitNetAmount(10, 3);
    const [first, ...rest] = shares;
    for (const share of rest) {
      expect(share).toBeLessThanOrEqual(first);
    }
  });
});
