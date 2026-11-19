import { prisma } from "@/lib/db";
import { updateCustomer } from "@/lib/paystack/api";
import { describePaystackError } from "@/lib/paystack/client";
import { normalizeNigerianPhone, nigerianPhoneVariants } from "@/lib/utils/phone";

export interface IdentityFields {
  firstName?: string;
  lastName?: string;
  mobilePhone?: string;
}
type IdentityField = keyof IdentityFields;

export type IdentityChangeResult =
  | { ok: true; changes: IdentityFields } // empty = nothing to change
  | { ok: false; fieldErrors?: Record<string, string>; error?: string };

const LABELS: Record<IdentityField, string> = {
  firstName: "First name",
  lastName: "Last name",
  mobilePhone: "Phone number",
};

const NAME_MAX = 60;
// Letters (any script), then letters/spaces/dots/apostrophes/hyphens — what a name on a BVN
// record can actually contain. Digits and symbols can only ever mean a typo.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

function tidyName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Validates a name/phone edit from the profile form and, when something really changed,
 * syncs it to Paystack — returning only the fields to save, for the caller to write with the
 * rest of the profile. Nothing is written locally here.
 *
 * These are the details Paystack matches a BVN against (the customer's name must agree with the BVN
 * record), so a local-only edit would silently set a user up for a failed verification. Hence: no
 * Paystack customer yet → plain local edit (creation will use the new values); customer exists but
 * unverified → Paystack is updated first and a refusal blocks the whole edit; verified → locked, since
 * a change would desync the record from the identity that was verified. Someone whose verification
 * was rejected is unverified, so they can correct a wrong name here and resubmit.
 *
 * A field left `undefined` wasn't part of the form (e.g. admins) — nothing to do for it.
 */
export async function prepareProfileIdentityChange(
  userId: string,
  submitted: IdentityFields
): Promise<IdentityChangeResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      firstName: true,
      lastName: true,
      mobilePhone: true,
      paystackCustomerCode: true,
      kycVerified: true,
      kycFailedReason: true,
    },
  });
  if (!user) return { ok: false, error: "Account not found." };

  const changes: IdentityFields = {};
  const fieldErrors: Record<string, string> = {};

  for (const field of ["firstName", "lastName"] as const) {
    const raw = submitted[field];
    if (raw === undefined) continue;

    const name = tidyName(raw);
    if (!name) {
      fieldErrors[field] = `${LABELS[field]} can't be empty.`;
      continue;
    }
    // Untouched field, whatever shape it was stored in — never re-validate it, or anyone with
    // an unusual existing name couldn't save an unrelated profile change.
    if (name === tidyName(user[field])) continue;

    if (name.length > NAME_MAX || !NAME_PATTERN.test(name)) {
      fieldErrors[field] = `Enter a valid ${LABELS[field].toLowerCase()} — letters only (spaces, hyphens and apostrophes are fine).`;
      continue;
    }
    changes[field] = name;
  }

  if (submitted.mobilePhone !== undefined) {
    const raw = submitted.mobilePhone.trim();
    if (!raw) {
      fieldErrors.mobilePhone = "Phone number can't be empty.";
    } else if (raw !== user.mobilePhone) {
      const normalized = normalizeNigerianPhone(raw);
      if (!normalized) {
        fieldErrors.mobilePhone = "Enter a valid Nigerian mobile number, e.g. 0810 123 4567.";
      } else if (normalized !== (normalizeNigerianPhone(user.mobilePhone) ?? user.mobilePhone)) {
        changes.mobilePhone = normalized;
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors };

  const changed = (Object.keys(changes) as IdentityField[]).filter((field) => changes[field] !== undefined);
  if (changed.length === 0) return { ok: true, changes };

  if (user.kycVerified) {
    for (const field of changed) {
      fieldErrors[field] = `${LABELS[field]} is part of your verified identity, so it can't be changed here.`;
    }
    return { ok: false, fieldErrors };
  }

  if (changes.mobilePhone) {
    const taken = await prisma.user.findFirst({
      where: { id: { not: userId }, mobilePhone: { in: nigerianPhoneVariants(changes.mobilePhone) } },
      select: { id: true },
    });
    if (taken) return { ok: false, fieldErrors: { mobilePhone: "An account with this phone number already exists." } };
  }

  if (user.paystackCustomerCode) {
    try {
      // The full resulting identity, so the fields that didn't change go along with the ones that did.
      await updateCustomer(user.paystackCustomerCode, {
        firstName: changes.firstName ?? user.firstName,
        lastName: changes.lastName ?? user.lastName,
        phone: changes.mobilePhone ?? user.mobilePhone,
      });
    } catch (err) {
      console.error(`Paystack customer update failed for user ${userId}:`, err);
      return { ok: false, error: `Couldn't update your details with our payment partner: ${describePaystackError(err)}` };
    }
  }

  return { ok: true, changes };
}
