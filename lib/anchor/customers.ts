import { anchorRequest } from "./client";
import type { AnchorDocument } from "./types";

// NOTE: unlike accounts.ts/transfers.ts, these endpoint shapes were not directly observed
// in the old Django codebase (only referenced indirectly — e.g. the `my_customerID`
// metadata key and `externalReference` attribute are confirmed from
// payment/webhooks.py's resolve_user()). Verify against Anchor's sandbox docs before
// relying on these in production.

interface CustomerAttrs {
  fullName?: { firstName: string; lastName: string };
  email?: string;
  phoneNumber?: string;
}

/**
 * Creates an Anchor IndividualCustomer for a new user. `externalReference` and the
 * `my_customerID` metadata field are both confirmed conventions from
 * payment/webhooks.py::resolve_user, which looks up the internal User by either.
 */
export async function createIndividualCustomer(user: {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  mobilePhone: string;
}): Promise<string> {
  const result = await anchorRequest<AnchorDocument<CustomerAttrs>>("/customers", {
    method: "POST",
    body: {
      data: {
        type: "IndividualCustomer",
        attributes: {
          fullName: { firstName: user.firstName, lastName: user.lastName },
          email: user.email,
          // Anchor rejects a leading "+" ("Invalid input +234... supplied for field
          // phoneNumber") — confirmed live against the sandbox. Every signup this session
          // failed provisioning silently because of this; strip it before sending.
          phoneNumber: user.mobilePhone.replace(/^\+/, ""),
          externalReference: user.id,
          metadata: { my_customerID: user.id },
        },
      },
    },
  });
  return result.data.id;
}

interface CounterPartyAttrs {
  bankCode?: string;
  accountNumber?: string;
}

/** Creates an Anchor CounterParty representing the user's linked external bank account. */
export async function createCounterParty(params: {
  bankCode: string;
  accountNumber: string;
  accountName: string;
}): Promise<string> {
  const result = await anchorRequest<AnchorDocument<CounterPartyAttrs>>("/counterparties", {
    method: "POST",
    body: {
      data: {
        type: "CounterParty",
        attributes: {
          bankCode: params.bankCode,
          accountNumber: params.accountNumber,
          verifyName: true,
          accountName: params.accountName,
        },
      },
    },
  });
  return result.data.id;
}

interface VerificationAttrs {
  status?: string;
}

/**
 * Submits Tier-2 KYC identification (BVN/DOB/gender) for an existing customer. Anchor
 * matches the BVN's name and phone number against those given at customer creation —
 * a mismatch surfaces as a `customer.identification.rejected` webhook, not an error here;
 * this call just kicks off that async check. Confirmed against
 * https://docs.getanchor.co/docs/individual-customer-kyc: bvn/dateOfBirth/gender must be
 * nested under `level2`, and gender is title-cased ("Male"/"Female"), not our enum's casing.
 */
export async function submitIndividualVerification(params: {
  customerId: string;
  bvn: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: "MALE" | "FEMALE";
}): Promise<void> {
  await anchorRequest<AnchorDocument<VerificationAttrs>>(`/customers/${params.customerId}/verification/individual`, {
    method: "POST",
    body: {
      data: {
        type: "Verification",
        attributes: {
          level: "TIER_2",
          level2: {
            bvn: params.bvn,
            dateOfBirth: params.dateOfBirth,
            gender: params.gender === "MALE" ? "Male" : "Female",
          },
        },
      },
    },
  });
}

interface BankAttrs {
  name: string;
  nipCode?: string;
  cbnCode?: string;
}

/** Lists Nigerian banks for the signup/withdrawal bank picker. */
export async function listBanks(): Promise<{ code: string; name: string }[]> {
  const result = await anchorRequest<{ data: { id: string; attributes: BankAttrs }[] }>("/banks");
  return result.data.map((bank) => ({
    code: bank.attributes.nipCode ?? bank.attributes.cbnCode ?? bank.id,
    name: bank.attributes.name,
  }));
}

interface AccountNumberAttrs {
  accountName?: string;
}

/** Resolves an account name for a given bank code + account number (pre-withdrawal verification). */
export async function verifyBankAccount(bankCode: string, accountNumber: string): Promise<string | null> {
  const result = await anchorRequest<AnchorDocument<AccountNumberAttrs>>(
    `/payments/verify-account/${bankCode}/${accountNumber}`
  );
  return result.data.attributes.accountName ?? null;
}
