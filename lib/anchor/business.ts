import { anchorRequest, anchorUpload } from "./client";
import type { AnchorDocument, AnchorListDocument } from "./types";

// Maps our Prisma BusinessRegistrationType enum (SCREAMING_SNAKE, for DB/URL friendliness)
// to Anchor's exact Title_Case values, confirmed against
// https://docs.getanchor.co/docs/business-customer-requirements.
const ANCHOR_REGISTRATION_TYPE: Record<string, string> = {
  PRIVATE_INCORPORATED: "Private_Incorporated",
  INCORPORATED_TRUSTEES: "Incorporated_Trustees",
  BUSINESS_NAME: "Business_Name",
  FREE_ZONE: "Free_Zone",
  GOV: "Gov",
  PRIVATE_INCORPORATED_GOV: "Private_Incorporated_Gov",
  COOPERATIVE_SOCIETY: "Cooperative_Society",
  PUBLIC_INCORPORATED: "Public_Incorporated",
};

interface BusinessCustomerAttrs {
  status?: string;
}

/**
 * BusinessCustomer's phoneNumber fields are validated as an 11-digit local number
 * ("phoneNumber size must be between 11 and 11" / "numeric value out of bounds" on a
 * 234-prefixed number) — confirmed live. Different from IndividualCustomer, which just
 * needs the leading "+" stripped.
 */
function toLocalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("234")) return `0${digits.slice(3)}`;
  if (digits.startsWith("0")) return digits;
  return `0${digits}`;
}

/**
 * Creates an Anchor BusinessCustomer. The submitting Event Manager is passed as the sole
 * OWNER officer, reusing their own already-verified individual KYC data (BVN/DOB/gender) —
 * Anchor requires at least one officer's personal KYC on every business customer, and an
 * org owner is legitimately an owner/director of the business they're registering.
 * Shape confirmed against https://docs.getanchor.co/docs/business-customer-creation.
 */
export async function createBusinessCustomer(params: {
  organizationId: string;
  businessName: string;
  businessDescription: string;
  businessBvn: string;
  industry: string;
  registrationType: string;
  dateOfRegistration: string; // YYYY-MM-DD
  addressLine1: string;
  city: string;
  state: string;
  officer: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
    bvn: string;
    dateOfBirth: string; // YYYY-MM-DD
    gender: "MALE" | "FEMALE";
    state: string;
  };
}): Promise<string> {
  const anchorRegType = ANCHOR_REGISTRATION_TYPE[params.registrationType] ?? params.registrationType;

  const result = await anchorRequest<AnchorDocument<BusinessCustomerAttrs>>("/customers", {
    method: "POST",
    body: {
      data: {
        type: "BusinessCustomer",
        attributes: {
          basicDetail: {
            businessName: params.businessName,
            registrationType: anchorRegType,
            country: "NG",
            dateOfRegistration: params.dateOfRegistration,
            description: params.businessDescription,
            businessBvn: params.businessBvn,
            industry: params.industry,
          },
          address: { country: "NG", state: params.state },
          contact: {
            email: { general: params.officer.email },
            phoneNumber: toLocalPhone(params.officer.phoneNumber),
            address: {
              main: {
                country: "NG",
                state: params.state,
                addressLine_1: params.addressLine1,
                city: params.city,
              },
              registered: {
                country: "NG",
                state: params.state,
                addressLine_1: params.addressLine1,
                city: params.city,
              },
            },
          },
          officers: [
            {
              role: "OWNER",
              fullName: { firstName: params.officer.firstName, lastName: params.officer.lastName },
              nationality: "NG",
              // Anchor requires addressLine_1/city on the officer's address, not just
              // country/state — confirmed live. We don't collect a separate personal
              // address for the officer, so reuse the business address.
              address: {
                country: "NG",
                state: params.officer.state,
                addressLine_1: params.addressLine1,
                city: params.city,
              },
              dateOfBirth: params.officer.dateOfBirth,
              email: params.officer.email,
              phoneNumber: toLocalPhone(params.officer.phoneNumber),
              bvn: params.officer.bvn,
              gender: params.officer.gender === "MALE" ? "Male" : "Female",
              // Anchor's `title` is a job-title enum, not the org-membership role — it
              // rejected "OWNER" with "must be one of: [CEO, COO, CFO, President, CIO, VP,
              // Treasurer, Controller, Manager, Partner, Member]", confirmed live.
              title: "CEO",
              percentageOwned: 100,
            },
          ],
          externalReference: params.organizationId,
          metadata: { my_customerID: params.organizationId },
        },
      },
    },
  });

  return result.data.id;
}

interface VerificationAttrs {
  message?: string;
}

/** Triggers KYB for a BusinessCustomer. No body — Anchor responds with required-document webhooks. */
export async function submitBusinessVerification(customerId: string): Promise<void> {
  await anchorRequest<AnchorDocument<VerificationAttrs>>(`/customers/${customerId}/verification/business`, {
    method: "POST",
  });
}

export interface RequiredDocument {
  id: string;
  type: string;
  status?: string;
}

interface DocumentAttrs {
  type?: string;
  status?: string;
}

/** Lists the documents Anchor requires (or has received) for a business customer. */
export async function listRequiredDocuments(customerId: string): Promise<RequiredDocument[]> {
  const result = await anchorRequest<AnchorListDocument<DocumentAttrs>>(`/documents/${customerId}`);
  return result.data.map((doc) => ({
    id: doc.id,
    type: doc.attributes.type ?? doc.type,
    status: doc.attributes.status,
  }));
}

/**
 * Uploads a single KYB document. RC_NUMBER/TIN-type documents are text-only (`textData`);
 * everything else (certificates, address proof) is a file (`fileData`). Confirmed against
 * https://docs.getanchor.co/docs/business-customer-kyb.
 */
export async function uploadBusinessDocument(
  customerId: string,
  documentId: string,
  fields: { fileData?: Blob; textData?: string }
): Promise<void> {
  await anchorUpload(`/documents/upload-document/${customerId}/${documentId}`, fields);
}
