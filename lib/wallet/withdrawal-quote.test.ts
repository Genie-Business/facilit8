import { describe, expect, it } from "vitest";

import { paystackTransferFee } from "../paystack/transfer-fees";
import { maxWithdrawable, quoteWithdrawal, type WithdrawalFeeSchedule } from "./withdrawal-quote";

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

describe("quoteWithdrawal: the amount is what the user receives, fees go on top", () => {
  it("with no Facilit8 fee, the user pays only Paystack's on top", () => {
    const q = quote(20_000);
    expect(q.receive).toBe(20_000);
    expect(q.facilit8Fee).toBe(0);
    expect(q.transferFee).toBe(75);
    expect(q.debit).toBe(20_075);
  });

  it("charges Facilit8's percentage on the amount withdrawn, then Paystack's fee on top of both", () => {
    const q = quote(10_000, ONE_PERCENT_CAP_500);
    expect(q.receive).toBe(10_000);
    expect(q.facilit8Fee).toBe(100); // 1% of what they withdraw
    expect(q.transferFee).toBe(75); // ₦25 + ₦50 stamp duty, since ₦10,000 is sent
    expect(q.debit).toBe(10_175);
  });

  it("caps Facilit8's fee but not Paystack's", () => {
    const q = quote(200_000, ONE_PERCENT_CAP_500);
    expect(q.receive).toBe(200_000);
    expect(q.facilit8Fee).toBe(500);
    expect(q.transferFee).toBe(100);
    expect(q.debit).toBe(200_600);
  });

  it("always adds up: receive + both fees = debit, to the kobo", () => {
    for (const amount of [100, 150, 999.99, 5_000, 5_011, 9_990, 10_075, 50_075, 123_456.78, 2_000_000]) {
      for (const schedule of [FREE, ONE_PERCENT_CAP_500, { percentage: 1.5, maxAmount: null }]) {
        const q = quote(amount, schedule);
        expect(q.receive).toBe(amount);
        expect(kobo(q.receive) + kobo(q.transferFee) + kobo(q.facilit8Fee)).toBe(kobo(q.debit));
      }
    }
  });

  it("the stamp-duty boundary costs ₦50 more, and no more", () => {
    expect(quote(9_999.99).transferFee).toBe(25);
    expect(quote(10_000).transferFee).toBe(75);
  });

  it("refuses amounts below the ₦100 minimum, and nonsense", () => {
    expect(quoteWithdrawal(99.99, FREE)).toEqual({ ok: false, reason: "too_small" });
    expect(quoteWithdrawal(0, FREE)).toEqual({ ok: false, reason: "too_small" });
    expect(quoteWithdrawal(-500, FREE)).toEqual({ ok: false, reason: "too_small" });
    expect(quoteWithdrawal(Number.NaN, FREE)).toEqual({ ok: false, reason: "too_small" });
    expect(quoteWithdrawal(100, FREE).ok).toBe(true);
  });
});

describe("maxWithdrawable: the most a balance can send once fees are added", () => {
  const costOf = (receive: number, schedule: WithdrawalFeeSchedule) => quote(receive, schedule).debit;

  it("is the largest amount whose total still fits, and one kobo more would not", () => {
    for (const balance of [150, 1_000, 5_010, 9_999, 10_075, 20_000, 123_456.78, 1_000_000]) {
      for (const schedule of [FREE, ONE_PERCENT_CAP_500, { percentage: 1.5, maxAmount: null }]) {
        const max = maxWithdrawable(balance, schedule);
        if (max === 0) continue;
        expect(kobo(costOf(max, schedule))).toBeLessThanOrEqual(kobo(balance));
        const oneKoboMore = quoteWithdrawal(max + 0.01, schedule);
        expect(oneKoboMore.ok && kobo(oneKoboMore.quote.debit) > kobo(balance)).toBe(true);
      }
    }
  });

  it("with no Facilit8 fee: ₦20,000 sends ₦19,925 (₦75 transfer fee)", () => {
    expect(maxWithdrawable(20_000, FREE)).toBe(19_925);
  });

  it("is a little under the balance, never over it", () => {
    for (const balance of [500, 7_000, 60_000, 400_000]) {
      const max = maxWithdrawable(balance, ONE_PERCENT_CAP_500);
      expect(max).toBeGreaterThan(0);
      expect(max).toBeLessThan(balance);
    }
  });

  it("is 0 when the balance can't cover even the smallest withdrawal plus its fees", () => {
    expect(maxWithdrawable(0, FREE)).toBe(0);
    expect(maxWithdrawable(50, FREE)).toBe(0);
    expect(maxWithdrawable(109.99, FREE)).toBe(0); // ₦100 + ₦10 fee needs ₦110
    expect(maxWithdrawable(110, FREE)).toBe(100);
  });
});
