import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { toE164 } from "./api";
import { isDefinitiveFailure, PaystackApiError } from "./client";
import { normalizeTransferStatus } from "./status";
import { paystackEventKey, verifyPaystackSignature } from "./webhook-signature";

const sign = (body: string, secret: string) => createHmac("sha512", secret).update(body).digest("hex");

describe("verifyPaystackSignature", () => {
  const body = JSON.stringify({ event: "charge.success", data: { id: 42, amount: 10_000_00 } });

  it("accepts a correctly signed body", () => {
    expect(verifyPaystackSignature(body, sign(body, "sk_test_abc"), ["sk_test_abc"])).toBe(true);
  });

  it("rejects a body that was changed after signing", () => {
    const tampered = body.replace("1000000", "9000000");
    expect(verifyPaystackSignature(tampered, sign(body, "sk_test_abc"), ["sk_test_abc"])).toBe(false);
  });

  it("rejects the wrong secret, an empty signature and no secrets at all", () => {
    expect(verifyPaystackSignature(body, sign(body, "someone_elses_key"), ["sk_test_abc"])).toBe(false);
    expect(verifyPaystackSignature(body, "", ["sk_test_abc"])).toBe(false);
    expect(verifyPaystackSignature(body, null, ["sk_test_abc"])).toBe(false);
    expect(verifyPaystackSignature(body, sign(body, "sk_test_abc"), [])).toBe(false);
  });

  it("is a hash of the RAW bytes, so re-serialising valid JSON can't pass", () => {
    const spaced = `{"event": "charge.success",  "data": {"id": 42, "amount": 1000000}}`;
    expect(verifyPaystackSignature(spaced, sign(body, "sk_test_abc"), ["sk_test_abc"])).toBe(false);
    expect(verifyPaystackSignature(spaced, sign(spaced, "sk_test_abc"), ["sk_test_abc"])).toBe(true);
  });

  it("accepts either the secret key or the webhook signing secret, so rotation drops nothing", () => {
    const both = ["whsec_new", "sk_test_old"];
    expect(verifyPaystackSignature(body, sign(body, "whsec_new"), both)).toBe(true);
    expect(verifyPaystackSignature(body, sign(body, "sk_test_old"), both)).toBe(true);
  });

  it("tolerates upper-case hex from a proxy", () => {
    expect(verifyPaystackSignature(body, sign(body, "k").toUpperCase(), ["k"])).toBe(true);
  });

  it("rejects a signature of the wrong length without throwing", () => {
    expect(verifyPaystackSignature(body, "abc123", ["k"])).toBe(false);
  });
});

describe("paystackEventKey", () => {
  it("is stable for a redelivery of the same event", () => {
    const a = JSON.stringify({ event: "transfer.success", data: { id: 7, reference: "wd-1" } });
    expect(paystackEventKey(JSON.parse(a), a)).toBe(paystackEventKey(JSON.parse(a), a));
  });

  it("distinguishes success from a later reversal of the same transfer", () => {
    const success = { event: "transfer.success", data: { id: 7 } };
    const reversed = { event: "transfer.reversed", data: { id: 7 } };
    expect(paystackEventKey(success, "x")).not.toBe(paystackEventKey(reversed, "x"));
  });

  it("identifies by reference, transfer code or customer when there is no id", () => {
    expect(paystackEventKey({ event: "transfer.failed", data: { reference: "wd-9" } }, "x")).toBe("transfer.failed:wd-9");
    expect(paystackEventKey({ event: "transfer.failed", data: { transfer_code: "TRF_1" } }, "x")).toBe("transfer.failed:TRF_1");
    expect(paystackEventKey({ event: "dedicatedaccount.assign.success", data: { customer: { customer_code: "CUS_1" } } }, "x")).toBe(
      "dedicatedaccount.assign.success:CUS_1"
    );
  });

  it("falls back to a hash of the body so different anonymous events never collapse", () => {
    const a = paystackEventKey({ event: "mystery" }, "body one");
    const b = paystackEventKey({ event: "mystery" }, "body two");
    expect(a).not.toBe(b);
    expect(a).toBe(paystackEventKey({ event: "mystery" }, "body one"));
  });
});

describe("normalizeTransferStatus", () => {
  it("maps Paystack's statuses to the few we act on", () => {
    expect(normalizeTransferStatus("success")).toBe("SUCCESS");
    expect(normalizeTransferStatus("SUCCESS")).toBe("SUCCESS");
    for (const failed of ["failed", "rejected", "blocked", "abandoned"]) expect(normalizeTransferStatus(failed)).toBe("FAILED");
    expect(normalizeTransferStatus("reversed")).toBe("REVERSED");
    expect(normalizeTransferStatus("otp")).toBe("OTP");
  });

  it("treats anything unknown as still in flight — never as a failure that would release the money", () => {
    for (const unknown of ["pending", "processing", "received", "queued", "something-new", "", null, undefined]) {
      expect(normalizeTransferStatus(unknown as string)).toBe("PENDING");
    }
  });
});

describe("isDefinitiveFailure", () => {
  it("is true only when Paystack clearly refused", () => {
    expect(isDefinitiveFailure(new PaystackApiError("Insufficient balance", 400, null))).toBe(true);
    expect(isDefinitiveFailure(new PaystackApiError("Recipient not found", 404, null))).toBe(true);
    expect(isDefinitiveFailure(new PaystackApiError("Too many requests", 429, null))).toBe(true);
  });

  it("is false when we can't know whether the transfer was created", () => {
    expect(isDefinitiveFailure(new PaystackApiError("timeout", 0, null, "network"))).toBe(false);
    expect(isDefinitiveFailure(new PaystackApiError("Bad gateway", 502, null))).toBe(false);
    expect(isDefinitiveFailure(new PaystackApiError("Internal error", 500, null))).toBe(false);
    expect(isDefinitiveFailure(new PaystackApiError("Request timeout", 408, null))).toBe(false);
    expect(isDefinitiveFailure(new Error("something else"))).toBe(false);
  });
});

describe("toE164", () => {
  it("converts Nigerian numbers to +234 form", () => {
    expect(toE164("08012345678")).toBe("+2348012345678");
    expect(toE164("0801 234 5678")).toBe("+2348012345678");
    expect(toE164("+2348012345678")).toBe("+2348012345678");
    expect(toE164("2348012345678")).toBe("+2348012345678");
  });

  it("returns undefined for something that isn't a Nigerian mobile number", () => {
    expect(toE164("12345")).toBeUndefined();
    expect(toE164("+14155550100")).toBeUndefined();
  });
});
