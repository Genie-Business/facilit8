import { WITHDRAWAL_REFERENCE_PREFIX } from "./references";

const VIRTUAL_ACCOUNT_CHANNEL = "dedicated_nuban";
const OWN_EVENT_PREFIXES = ["dedicatedaccount.", "assigndedicatedaccount.", "customeridentification."];

const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/**
 * Whether a Paystack event is one Facilit8 acts on. Paystack sends every event for the account to
 * every webhook endpoint, and the account may be shared with another product (its card payments and
 * its payouts arrive here too), so anything that isn't Facilit8's is answered and dropped without
 * being stored: no other product's customer details end up in this database.
 *
 * Mirrors processPaystackEvent (lib/paystack/webhooks.ts): virtual-account and identity events,
 * deposits into a virtual account, and transfers whose reference is one of our withdrawals.
 */
export function isFacilit8Event(payload: { event: string; data?: unknown }): boolean {
  const event = payload.event;
  const data = (payload.data && typeof payload.data === "object" ? payload.data : {}) as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  if (OWN_EVENT_PREFIXES.some((prefix) => event.startsWith(prefix))) return true;
  if (event === "charge.success") return (text(data.channel) ?? text(data.authorization?.channel)) === VIRTUAL_ACCOUNT_CHANNEL;
  if (event.startsWith("transfer.")) return (text(data.reference) ?? "").toLowerCase().startsWith(WITHDRAWAL_REFERENCE_PREFIX);
  return false;
}
