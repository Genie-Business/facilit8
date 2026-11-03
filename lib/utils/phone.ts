/**
 * Nigerian mobile numbers arrive in several shapes — 0810 123 4567, +234 810 123 4567,
 * 2348101234567, with spaces/dashes/brackets. Returns the local 11-digit form Anchor already
 * stores for customers (e.g. "08101234567"), or null if it isn't a Nigerian mobile number.
 * Mobile prefixes are 070x, 080x, 081x, 090x, 091x — hence [789][01] after the leading 0.
 */
export function normalizeNigerianPhone(input: string): string | null {
  const compact = input.replace(/[\s\-().]/g, "");
  const match = compact.match(/^(?:\+?234|0)([789][01]\d{8})$/);
  return match ? `0${match[1]}` : null;
}

/** Every string form the same Nigerian number could already be stored as, since signup never
 * normalized what people typed — needed to catch "08101234567" vs "+2348101234567" collisions. */
export function nigerianPhoneVariants(local: string): string[] {
  const rest = local.slice(1);
  return [local, `234${rest}`, `+234${rest}`];
}
