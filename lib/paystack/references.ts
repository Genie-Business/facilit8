/**
 * Every withdrawal's Paystack transfer reference starts with this. It is how a transfer event is
 * recognised as Facilit8's when the Paystack account is shared with another product (whose own
 * references look different), so it must stay in step with where the reference is created.
 */
export const WITHDRAWAL_REFERENCE_PREFIX = "wd-";
