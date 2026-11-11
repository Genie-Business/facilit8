import { describe, expect, it } from "vitest";

import {
  chargeLegs,
  depositLegs,
  fundingLegs,
  payoutLegs,
  refundLegs,
  withdrawalHoldLegs,
  withdrawalReleaseLegs,
  withdrawalReversalLegs,
  withdrawalSettleLegs,
} from "./journals";

const sumKobo = (legs: { amount: number }[]) => legs.reduce((total, leg) => total + Math.round(leg.amount * 100), 0);
const amountOn = (legs: { account: string; amount: number }[], account: string) =>
  legs.filter((leg) => leg.account === account).reduce((total, leg) => total + leg.amount, 0);

describe("every journal balances to exactly zero", () => {
  it("deposit, with and without a Paystack fee", () => {
    expect(sumKobo(depositLegs({ userId: "u1", gross: 100_000, paystackFee: 300 }))).toBe(0);
    expect(sumKobo(depositLegs({ userId: "u1", gross: 5_000, paystackFee: 0 }))).toBe(0);
    expect(sumKobo(depositLegs({ userId: "u1", gross: 333.33, paystackFee: 3.33 }))).toBe(0);
  });

  it("funding, charge, refund", () => {
    expect(sumKobo(fundingLegs("u1", 250_000))).toBe(0);
    expect(sumKobo(chargeLegs("u1", 5_000))).toBe(0);
    expect(sumKobo(refundLegs("u1", 250_000))).toBe(0);
  });

  it("payout to one payee and to a split", () => {
    expect(sumKobo(payoutLegs({ payees: [{ userId: "f1", amount: 225_000 }], fee: 25_000 }))).toBe(0);
    expect(
      sumKobo(
        payoutLegs({
          payees: [
            { userId: "f1", amount: 33.34 },
            { userId: "f2", amount: 33.33 },
            { userId: "f3", amount: 33.33 },
          ],
          fee: 0.1,
        })
      )
    ).toBe(0);
    expect(sumKobo(payoutLegs({ payees: [{ userId: "f1", amount: 100 }], fee: 0 }))).toBe(0);
  });

  it("the full withdrawal lifecycle: hold, settle, release, reversal", () => {
    expect(sumKobo(withdrawalHoldLegs("u1", 10_075))).toBe(0);
    expect(sumKobo(withdrawalSettleLegs({ debit: 10_075, facilit8Fee: 100, transferred: 9_975 }))).toBe(0);
    expect(sumKobo(withdrawalReleaseLegs("u1", 10_075))).toBe(0);
    expect(sumKobo(withdrawalReversalLegs({ userId: "u1", debit: 10_075, facilit8Fee: 100, transferred: 9_975 }))).toBe(0);
  });
});

describe("who ends up with what", () => {
  it("a deposit credits the user with what they SENT, and Facilit8 absorbs Paystack's fee", () => {
    const legs = depositLegs({ userId: "u1", gross: 100_000, paystackFee: 300 });
    expect(amountOn(legs, "user:u1")).toBe(100_000);
    expect(amountOn(legs, "external")).toBe(-99_700); // what actually reached Paystack's balance
    expect(amountOn(legs, "paystack_fees")).toBe(-300);
  });

  it("a payout moves the gross out of escrow: net to the payee, the fee to revenue", () => {
    const legs = payoutLegs({ payees: [{ userId: "f1", amount: 225_000 }], fee: 25_000 });
    expect(amountOn(legs, "escrow")).toBe(-250_000);
    expect(amountOn(legs, "user:f1")).toBe(225_000);
    expect(amountOn(legs, "revenue")).toBe(25_000);
  });

  it("settling a withdrawal: the fee is revenue and the rest leaves through EXTERNAL", () => {
    const legs = withdrawalSettleLegs({ debit: 10_075, facilit8Fee: 100, transferred: 9_975 });
    expect(amountOn(legs, "transfers_pending")).toBe(-10_075);
    expect(amountOn(legs, "revenue")).toBe(100);
    expect(amountOn(legs, "external")).toBe(9_975);
  });

  it("releasing a withdrawal gives the user back everything that was held", () => {
    const legs = withdrawalReleaseLegs("u1", 10_075);
    expect(amountOn(legs, "user:u1")).toBe(10_075);
  });

  it("reversing a settled withdrawal undoes the settlement and refunds the user in full", () => {
    const settle = withdrawalSettleLegs({ debit: 10_075, facilit8Fee: 100, transferred: 9_975 });
    const reverse = withdrawalReversalLegs({ userId: "u1", debit: 10_075, facilit8Fee: 100, transferred: 9_975 });
    expect(amountOn(reverse, "external")).toBe(-amountOn(settle, "external"));
    expect(amountOn(reverse, "revenue")).toBe(-amountOn(settle, "revenue"));
    expect(amountOn(reverse, "user:u1")).toBe(10_075);
  });
});

describe("bad input is refused, not posted", () => {
  it("rejects zero and negative amounts", () => {
    expect(() => fundingLegs("u1", 0)).toThrow(RangeError);
    expect(() => chargeLegs("u1", -5)).toThrow(RangeError);
    expect(() => withdrawalHoldLegs("u1", 0)).toThrow(RangeError);
  });

  it("rejects a Paystack fee that swallows the whole deposit", () => {
    expect(() => depositLegs({ userId: "u1", gross: 300, paystackFee: 300 })).toThrow(RangeError);
    expect(() => depositLegs({ userId: "u1", gross: 300, paystackFee: -1 })).toThrow(RangeError);
  });

  it("rejects a settlement whose pieces don't add up to the debit", () => {
    expect(() => withdrawalSettleLegs({ debit: 10_075, facilit8Fee: 100, transferred: 9_900 })).toThrow(RangeError);
  });

  it("rejects a payout with nobody to pay", () => {
    expect(() => payoutLegs({ payees: [], fee: 10 })).toThrow(RangeError);
  });
});
