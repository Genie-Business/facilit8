import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/services/notification.service";
import { createDepositAccount } from "./accounts";
import { uploadBusinessDocument } from "./business";

const TEXT_ONLY_DOCUMENT_TYPES = ["RC_NUMBER", "TIN"];

/**
 * Verifies the `x-anchor-signature` header: HMAC-SHA1 over the raw body, hex digest then
 * base64-encoded. Confirmed against payment/webhooks.py::anchor_webhook_view.
 */
export function verifyAnchorSignature(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const secret = process.env.ANCHOR_WEBHOOK_SECRET;
  if (!secret) throw new Error("ANCHOR_WEBHOOK_SECRET is not configured.");

  const hmacHex = createHmac("sha1", secret).update(rawBody).digest("hex");
  const expected = Buffer.from(hmacHex, "utf8").toString("base64");

  const expectedBuf = Buffer.from(expected);
  const receivedBuf = Buffer.from(signatureHeader);
  if (expectedBuf.length !== receivedBuf.length) return false;
  return timingSafeEqual(expectedBuf, receivedBuf);
}

interface JsonApiRef {
  id?: string;
  type?: string;
}

interface JsonApiResource {
  id?: string;
  type?: string;
  attributes?: Record<string, unknown>;
  // `data` is a single ref for to-one relationships (e.g. `customer`) but an array for
  // to-many ones (e.g. `documents`) — confirmed from a real
  // customer.identification.awaitingDocument payload, where `data.type` is the *event*
  // name ("customer.identification.awaitingDocument"), not the resource type; the actual
  // BusinessCustomer/IndividualCustomer only shows up under relationships.customer.
  relationships?: Record<string, { data?: JsonApiRef | JsonApiRef[] | null }>;
}

interface WebhookPayload {
  data?: JsonApiResource;
  included?: JsonApiResource[];
  event?: string;
  id?: string;
}

/** Normalizes a to-one relationship's `data` (single ref, possibly wrapped as a 1-item array). */
function toOneRef(data: JsonApiRef | JsonApiRef[] | null | undefined): JsonApiRef | null {
  if (!data) return null;
  return Array.isArray(data) ? (data[0] ?? null) : data;
}

/** Normalizes a to-many relationship's `data` into an array regardless of how it arrived. */
function toManyRefs(data: JsonApiRef | JsonApiRef[] | null | undefined): JsonApiRef[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

/**
 * Resolves the internal User for a webhook payload. Mirrors
 * payment/webhooks.py::resolve_user: first checks `included` for an IndividualCustomer's
 * `metadata.my_customerID`, then falls back to `relationships.customer`/self id matched
 * against `anchorCustomerId`.
 */
async function resolveUser(payload: WebhookPayload) {
  const dataBlock = payload.data ?? {};
  const included = payload.included ?? [];

  const customerResource = included.find((item) => item.type === "IndividualCustomer");
  const internalId = customerResource?.attributes?.metadata as { my_customerID?: string } | undefined;
  if (internalId?.my_customerID) {
    const user = await prisma.user.findUnique({ where: { id: internalId.my_customerID } });
    if (user) return user;
  }

  let customerId = toOneRef(dataBlock.relationships?.customer?.data)?.id;
  if (!customerId && dataBlock.type === "IndividualCustomer") {
    customerId = dataBlock.id;
  }
  if (customerId) {
    const user = await prisma.user.findUnique({ where: { anchorCustomerId: customerId } });
    if (user) return user;
  }

  return null;
}

/** Same resolution strategy as resolveUser, but for BusinessCustomer → Organization. */
async function resolveOrganization(payload: WebhookPayload) {
  const dataBlock = payload.data ?? {};
  const included = payload.included ?? [];

  const businessResource = included.find((item) => item.type === "BusinessCustomer");
  const internalId = businessResource?.attributes?.metadata as { my_customerID?: string } | undefined;
  if (internalId?.my_customerID) {
    const org = await prisma.organization.findUnique({ where: { id: internalId.my_customerID } });
    if (org) return org;
  }

  let customerId = toOneRef(dataBlock.relationships?.customer?.data)?.id;
  if (!customerId && dataBlock.type === "BusinessCustomer") {
    customerId = dataBlock.id;
  }
  if (customerId) {
    const org = await prisma.organization.findUnique({ where: { anchorBusinessCustomerId: customerId } });
    if (org) return org;
  }

  return null;
}

async function notifyOrgOwners(organizationId: string, message: string) {
  const owners = await prisma.organizationMembership.findMany({
    where: { organizationId, role: "OWNER", status: "APPROVED" },
    select: { userId: true },
  });
  for (const owner of owners) {
    await createNotification({ userId: owner.userId, notificationType: "SYSTEM", message });
  }
}

function isUnmasked(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && !value.includes("*");
}

export async function processAnchorWebhook(payload: WebhookPayload, eventType: string): Promise<string> {
  const dataBlock = payload.data ?? {};
  // `data.type` is often the *event* name (e.g. "customer.identification.awaitingDocument"),
  // not the resource type — confirmed from a real payload. The reliable signal is which
  // customer type the event actually points at, via relationships.customer or `included`.
  const isBusinessEvent =
    dataBlock.type === "BusinessCustomer" ||
    toOneRef(dataBlock.relationships?.customer?.data)?.type === "BusinessCustomer" ||
    (payload.included ?? []).some((item) => item.type === "BusinessCustomer");
  const user = isBusinessEvent ? null : await resolveUser(payload);
  const organization = isBusinessEvent ? await resolveOrganization(payload) : null;

  switch (eventType) {
    case "customer.created":
    case "customer.updated": {
      const anchorId = dataBlock.id;
      const externalRef = dataBlock.attributes?.externalReference as string | undefined;
      if (!externalRef || !anchorId) return "no_external_ref";

      if (isBusinessEvent) {
        await prisma.organization.updateMany({
          where: { id: externalRef },
          data: { anchorBusinessCustomerId: anchorId },
        });
      } else {
        await prisma.user.updateMany({
          where: { id: externalRef },
          data: { anchorCustomerId: anchorId },
        });
      }
      return "customer_synced";
    }

    case "customer.identification.approved": {
      if (organization) {
        await prisma.organization.update({
          where: { id: organization.id },
          data: { verificationStatus: "VERIFIED", verificationFailedReason: null },
        });
        await notifyOrgOwners(organization.id, `${organization.name} is now a verified business on Facilit8.`);
        return "kyb_approved";
      }
      if (user) {
        await prisma.user.update({ where: { id: user.id }, data: { kycVerified: true } });
        await createNotification({
          userId: user.id,
          notificationType: "KYC_STATUS",
          message: "Identity verified! We're generating your bank account details now.",
        });
        try {
          if (!user.depositAccountId && user.anchorCustomerId) {
            const accountId = await createDepositAccount(user.anchorCustomerId);
            await prisma.user.update({ where: { id: user.id }, data: { depositAccountId: accountId } });
          }
        } catch (err) {
          console.error(`Failed to trigger account opening for user ${user.id}:`, err);
        }
      }
      return "kyc_approved";
    }

    case "customer.identification.rejected": {
      const failureData = dataBlock.attributes?.failureEventData as { message?: string } | undefined;
      const reason = failureData?.message ?? "Data mismatch";

      if (organization) {
        await prisma.organization.update({
          where: { id: organization.id },
          data: { verificationStatus: "REJECTED", verificationFailedReason: reason },
        });
        await notifyOrgOwners(organization.id, `Business verification for ${organization.name} was rejected: ${reason}`);
        return "kyb_rejected";
      }
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { kycVerified: false, kycFailedReason: reason },
        });
        await createNotification({
          userId: user.id,
          notificationType: "KYC_STATUS",
          message: `KYC rejected: ${reason}`,
        });
      }
      return "kyc_rejected";
    }

    case "customer.identification.awaitingDocument": {
      if (!organization) return "no_org_matched";

      // Confirmed from a real payload: `attributes.requiredDocuments` is a parallel array
      // of { type, description } with NO id — the actual Anchor document IDs live in the
      // separate `relationships.documents.data` array, same order, same length. Zip them
      // together by index.
      const requiredDocs =
        (dataBlock.attributes?.requiredDocuments as { type?: string; description?: string }[] | undefined) ?? [];
      const documentRefs = toManyRefs(dataBlock.relationships?.documents?.data);

      for (let i = 0; i < requiredDocs.length; i++) {
        const anchorDocumentId = documentRefs[i]?.id;
        const documentType = requiredDocs[i]?.type;
        if (!anchorDocumentId) continue;

        await prisma.organizationDocument.upsert({
          where: { anchorDocumentId },
          create: {
            organizationId: organization.id,
            anchorDocumentId,
            documentType: documentType ?? "UNKNOWN",
            status: "REQUIRED",
          },
          update: {},
        });

        // RC_NUMBER/TIN are text-only documents — we already collected the CAC number at
        // submission time, so submit it immediately instead of making the owner re-enter it.
        if (documentType && TEXT_ONLY_DOCUMENT_TYPES.includes(documentType) && organization.cacNumber) {
          try {
            await uploadBusinessDocument(organization.anchorBusinessCustomerId!, anchorDocumentId, {
              textData: organization.cacNumber,
            });
            await prisma.organizationDocument.update({
              where: { anchorDocumentId },
              data: { status: "UPLOADED" },
            });
          } catch (err) {
            console.error(`Failed to auto-submit ${documentType} for org ${organization.id}:`, err);
          }
        }
      }

      await prisma.organization.update({
        where: { id: organization.id },
        data: { verificationStatus: "AWAITING_DOCUMENTS" },
      });
      await notifyOrgOwners(
        organization.id,
        `${organization.name} needs a few documents uploaded to finish business verification.`
      );
      return "awaiting_documents";
    }

    case "document.approved":
    case "document.rejected": {
      // Same event/resource split as awaitingDocument: dataBlock.id is likely the event's
      // own id, not the document's — prefer the relationships.document ref, fall back to
      // dataBlock.id in case this particular event doesn't follow that pattern.
      const documentId = toOneRef(dataBlock.relationships?.document?.data)?.id ?? dataBlock.id;
      if (!documentId) return "no_document_id";

      const failureData = dataBlock.attributes?.failureEventData as { message?: string } | undefined;
      await prisma.organizationDocument.updateMany({
        where: { anchorDocumentId: documentId },
        data: {
          status: eventType === "document.approved" ? "APPROVED" : "REJECTED",
          rejectionReason: eventType === "document.rejected" ? (failureData?.message ?? "Rejected") : null,
        },
      });
      return eventType === "document.approved" ? "document_approved" : "document_rejected";
    }

    case "accountNumber.created": {
      if (!user) return "no_user_matched";
      const included = payload.included ?? [];
      const accountDetails = included.find((item) => item.type === "AccountNumber" || item.type === "VirtualNuban");
      const attrs = accountDetails?.attributes ?? dataBlock.attributes ?? {};
      const accountNumber = attrs.accountNumber;
      if (!isUnmasked(accountNumber)) return "received_but_masked";

      const bank = attrs.bank as { name?: string } | undefined;
      const bankName = bank?.name ?? (attrs.bankName as string | undefined) ?? null;
      const accountName = attrs.accountName as string | undefined;

      await prisma.user.update({
        where: { id: user.id },
        data: { vaAccountNumber: accountNumber, vaAccountName: accountName, vaBankName: bankName },
      });
      await createNotification({
        userId: user.id,
        notificationType: "KYC_STATUS",
        message: `Funding account generated: ${bankName ?? ""} - ${accountNumber}`,
      });
      return "deposit_nuban_saved";
    }

    case "virtualNuban.opened":
    case "account.created": {
      if (!user) return "no_user_matched";
      const attrs = dataBlock.attributes ?? {};
      const accountNumber = attrs.accountNumber;
      if (!isUnmasked(accountNumber)) return "received_but_masked";

      const bankRaw = attrs.bank;
      const bankName =
        typeof bankRaw === "object" && bankRaw !== null
          ? ((bankRaw as { name?: string }).name ?? null)
          : ((bankRaw as string | undefined) ?? (attrs.bankName as string | undefined) ?? null);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          vaAccountNumber: accountNumber,
          vaAccountName: attrs.accountName as string | undefined,
          vaBankName: bankName,
          anchorVaId: dataBlock.id,
        },
      });
      await createNotification({
        userId: user.id,
        notificationType: "KYC_STATUS",
        message: `Wallet ready! ${bankName ?? ""}: ${accountNumber}`,
      });
      return "va_synced";
    }

    case "payment.settled": {
      if (user) {
        const paymentAttr = (dataBlock.attributes?.payment ?? {}) as { amount?: number };
        const amount = Number(paymentAttr.amount ?? 0) / 100;
        await createNotification({
          userId: user.id,
          notificationType: "PAYMENT_CONFIRMED",
          message: `₦${amount.toLocaleString()} received.`,
        });
      }
      return "payment_settled";
    }

    default:
      return "ignored";
  }
}
