import { prisma } from "@/lib/db";
import { updateIndividualCustomerPhone } from "@/lib/anchor/customers";
import { describeAnchorError } from "@/lib/anchor/types";
import { normalizeNigerianPhone, nigerianPhoneVariants } from "@/lib/utils/phone";

export type PhoneChangeResult =
  | { ok: true; newPhone: string | null } // null = nothing to change
  | { ok: false; error: string };

/**
 * Validates a phone-number edit from the profile form and, when it's a real change, syncs it
 * to Anchor — returning the normalized number for the caller to save with the rest of the
 * profile. Nothing is written locally here.
 *
 * The number is part of the identity Anchor matches a BVN against (name + phone must agree
 * with what the customer was created with), so a local-only edit would silently set a user up
 * for a failed verification. Hence: no Anchor customer yet → plain local edit (creation will
 * use the new number); customer exists but unverified → Anchor is updated first and a refusal
 * blocks the edit; verified → locked, since Anchor won't update a completed-KYC customer and
 * a local-only change would desync the record from the verified identity.
 *
 * `submitted` undefined means the field wasn't part of the form (e.g. admins, whose phone is
 * a placeholder) — nothing to do.
 */
export async function prepareProfilePhoneChange(userId: string, submitted: string | undefined): Promise<PhoneChangeResult> {
  if (submitted === undefined) return { ok: true, newPhone: null };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mobilePhone: true, firstName: true, lastName: true, anchorCustomerId: true, kycVerified: true },
  });
  if (!user) return { ok: false, error: "Account not found." };

  const raw = submitted.trim();
  if (!raw) return { ok: false, error: "Phone number can't be empty." };

  // Untouched field, whatever format signup happened to store it in — never re-validate it,
  // or anyone with a legacy-format number couldn't save an unrelated profile change.
  if (raw === user.mobilePhone) return { ok: true, newPhone: null };

  const normalized = normalizeNigerianPhone(raw);
  if (!normalized) return { ok: false, error: "Enter a valid Nigerian mobile number, e.g. 0810 123 4567." };
  if (normalized === (normalizeNigerianPhone(user.mobilePhone) ?? user.mobilePhone)) return { ok: true, newPhone: null };

  if (user.kycVerified) {
    return { ok: false, error: "Your phone number is part of your verified identity, so it can't be changed here." };
  }

  const taken = await prisma.user.findFirst({
    where: { id: { not: userId }, mobilePhone: { in: nigerianPhoneVariants(normalized) } },
    select: { id: true },
  });
  if (taken) return { ok: false, error: "An account with this phone number already exists." };

  if (user.anchorCustomerId) {
    try {
      await updateIndividualCustomerPhone(user.anchorCustomerId, {
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: normalized,
      });
    } catch (err) {
      console.error(`Anchor phone update failed for user ${userId}:`, err);
      const detail = describeAnchorError(err);
      if (/already.*(submit|verif)/i.test(detail)) {
        return {
          ok: false,
          error: "Your identity verification is already underway, so your phone number can't be changed until it finishes.",
        };
      }
      return { ok: false, error: `Couldn't update your phone number with our payment partner: ${detail}` };
    }
  }

  return { ok: true, newPhone: normalized };
}
