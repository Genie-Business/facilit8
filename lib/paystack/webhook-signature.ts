import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Paystack signs the raw request body with HMAC-SHA512 and sends the hex digest in
 * `x-paystack-signature`. The key is the account's secret key, or — if a dedicated webhook signing
 * secret has been generated in the dashboard — that secret. Both are accepted so rotating from one
 * to the other doesn't drop events. The raw bytes are hashed, never a re-serialised JSON object,
 * which can differ in whitespace or key order and would fail a valid signature.
 */
export function verifyPaystackSignature(rawBody: string, signature: string | null, secrets = signingSecrets()): boolean {
  if (!signature || secrets.length === 0) return false;
  const received = Buffer.from(signature.trim().toLowerCase(), "utf8");

  return secrets.some((secret) => {
    const expected = Buffer.from(createHmac("sha512", secret).update(rawBody).digest("hex"), "utf8");
    return expected.length === received.length && timingSafeEqual(expected, received);
  });
}

export function signingSecrets(): string[] {
  return [process.env.PAYSTACK_WEBHOOK_SECRET, process.env.PAYSTACK_SECRET_KEY].filter((value): value is string => !!value);
}

interface EventShape {
  event?: string;
  data?: { id?: number | string; reference?: string; transfer_code?: string; customer?: { customer_code?: string } };
}

/**
 * Paystack events carry no id of their own, so the dedupe key is the event name plus whatever
 * identifies the thing it's about — falling back to a hash of the whole body so two genuinely
 * different events never collapse into one, and a redelivery of the same one always does.
 */
export function paystackEventKey(payload: EventShape, rawBody: string): string {
  const subject = payload.data?.id ?? payload.data?.reference ?? payload.data?.transfer_code ?? payload.data?.customer?.customer_code;
  return `${payload.event ?? "unknown"}:${subject ?? createHash("sha256").update(rawBody).digest("hex")}`;
}
