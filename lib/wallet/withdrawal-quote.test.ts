import { describe, expect, it } from "vitest";

import { paystackTransferFee } from "../paystack/transfer-fees";
import { quoteWithdrawal, type WithdrawalFeeSchedule } from "./withdrawal-quote";

const FREE: WithdrawalFeeSchedule = { percentage: 0, maxAmount: null };
const ONE_PERCENT_CAP_500: WithdrawalFeeSchedule = { percentage: 1, maxAmount: 500 };

const quote = (amount: number, schedule = FREE) => {
  const result = quoteWithdrawal(amount, schedule);
  if (!result.ok) throw new Error(`expected a quote for ₦${amount}`);
  return result.quote;
};
const kobo = (n: number) => Math.round(n * 100);

describe("paystackTransferFee", () => {
  it("follows the published tiers", () => {
    expect(paystackTransferFee(100)).toBe(10);
    expect(paystackTransferFee(5_000)).toBe(10);
    expect(paystackTransferFee(5_000.01)).toBe(25);
    expect(paystackTransferFee(9_999.99)).toBe(25);
  });

  it("adds the ₦50 stamp duty from ₦10,000", () => {
    expect(paystackTransferFee(10_000)).toBe(75); // ₦25 + ₦50
    expect(paystackTransferFee(50_000)).toBe(75);
    expect(paystackTransferFee(50_000.01)).toBe(100); // ₦50 + ₦50
    expect(paystackTransferFee(1_000_000)).toBe(100);
  });
});

describe("quoteWithdrawal", () => {
  it("with no Facilit8 fee, the user pays only Paystack's", () => {
    const q = quote(20_000);
    expect(q.facilit8Fee).toBe(0);
    expect(q.transferFee).toBe(75);
    expect(q.receive).toBe(19_925);
    expect(q.debit).toBe(20_000);
  });

  it("layers Facilit8's percentage on top of Paystack's fee", () => {
    const q = quote(10_000, ONE_PERCENT_CAP_500);
    expect(q.facilit8Fee).toBe(100);
    expect(q.transferFee).toBe(25); // 9,875 received -> under the stamp-duty line
    expect(q.receive).toBe(9_875);
    expect(q.debit).toBe(10_000);
  });

  it("caps Facilit8's fee but not Paystack's", () => {
    const q = quote(200_000, ONE_PERCENT_CAP_500);
    expect(q.facilit8Fee).toBe(500);
    expect(q.transferFee).toBe(100);
    expect(q.receive).toBe(199_400);
    expect(q.debit).toBe(200_000);
  });

  it("always adds up: receive + both fees = debit", () => {
    for (const amount of [150, 999.99, 5_000, 5_011, 9_990, 10_075, 50_075, 123_456.78, 2_000_000]) {
      for (const schedule of [FREE, ONE_PERCENT_CAP_500, { percentage: 1.5, maxAmount: null }]) {
        const q = quote(amount, schedule);
        expect(kobo(q.receive) + kobo(q.transferFee) + kobo(q.facilit8Fee)).toBe(kobo(q.debit));
      }
    }
  });

  it("never charges more than the amount entered", () => {
    for (let amount = 120; amount <= 60_000; amount += 137.37) {
      const q = quote(Math.round(amount * 100) / 100, ONE_PERCENT_CAP_500);
      expect(kobo(q.debit)).toBeLessThanOrEqual(kobo(q.amount));
    }
  });

  it("sends the largest amount that fits, leaving only the unavoidable slack", () => {
    // No transfer has an amount + fee of exactly ₦5,011 (₦5,000 costs ₦5,010; ₦5,001 costs ₦5,026),
    // so ₦1 of slack stays in the wallet — and one more kobo could never have been sent.
    const q = quote(5_011);
    expect(q.receive).toBe(5_000);
    expect(q.debit).toBe(5_010);
    expect(kobo(q.receive + 0.01) + kobo(paystackTransferFee(q.receive + 0.01))).toBeGreaterThan(kobo(5_011));
  });

  it("the stamp-duty boundary costs the user ₦50, and no more", () => {
    expect(quote(9_999).receive).toBe(9_974); // just under ₦10,000: tier fee only
    expect(quote(10_075).receive).toBe(10_000); // ₦10,000 + ₦25 + ₦50
  });

  it("refuses amounts too small to be worth sending", () => {
    expect(quoteWithdrawal(50, FREE)).toEqual({ ok: false, reason: "too_small" });
    expect(quoteWithdrawal(100, FREE)).toEqual({ ok: false, reason: "too_small" }); // ₦100 - ₦10 fee < ₦100
    expect(quoteWithdrawal(110, FREE).ok).toBe(true);
    expect(quoteWithdrawal(100, { percentage: 100, maxAmount: null })).toEqual({ ok: false, reason: "too_small" });
  });
});
