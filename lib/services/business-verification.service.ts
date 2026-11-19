import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import { isAllowedDocumentUrl } from "@/lib/storage/blob";
import type { BusinessVerificationInput } from "@/lib/validation/business";
import { createNotification } from "./notification.service";

/**
 * Organization verification is a manual review. The owner submits the business's CAC details, the
 * owner or a manager uploads the required documents, and an admin approves the organization or sends
 * individual documents back with a reason.
 *
 *   UNVERIFIED --submit details--> AWAITING_DOCUMENTS --last document uploaded--> PENDING (in review)
 *   PENDING --approve--> VERIFIED
 *   PENDING --reject one document--> AWAITING_DOCUMENTS (that document goes back to REJECTED)
 *   PENDING --reject the organization--> REJECTED --submit details again--> AWAITING_DOCUMENTS
 *
 * Every transition is claimed with a conditional update on the current status, and the organization's
 * row is locked while documents are counted, so two people acting at once (two uploads, or an upload
 * racing a review) can't leave it in a state that doesn't match its documents.
 */

interface Result {
  success: boolean;
  error?: string;
}

/** What an organization has to provide. Rows of any other type (Anchor-era leftovers) are ignored. */
export const REQUIRED_DOCUMENT_TYPES = ["CERTIFICATE_OF_INCORPORATION", "PROOF_OF_ADDRESS"] as const;
const REQUIRED_TYPES: string[] = [...REQUIRED_DOCUMENT_TYPES];

export const DOCUMENT_LABELS: Record<string, string> = {
  CERTIFICATE_OF_INCORPORATION: "Certificate of incorporation / registration (CAC)",
  PROOF_OF_ADDRESS: "Proof of business address (utility bill or bank statement)",
};

/**
 * A refusal written for the person who triggered it. The actions show only these messages as they are;
 * anything else that goes wrong (a database hiccup, say) is logged and answered with a generic line,
 * so internal error text never reaches the screen.
 */
export class OrganizationAccessError extends Error {}

// Room for a slow moment on the database connection: the defaults (2s to start, 5s to finish) are
// tight enough that one slow round trip fails an upload that would otherwise have gone through.
const TRANSACTION_OPTIONS = { maxWait: 10_000, timeout: 20_000 };

function inTransaction<T>(run: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(run, TRANSACTION_OPTIONS);
}

async function requireApprovedMember(organizationId: string, userId: string, roles: ("OWNER" | "MANAGER")[]) {
  const membership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  if (!membership || membership.status !== "APPROVED" || !roles.includes(membership.role as "OWNER" | "MANAGER")) {
    throw new OrganizationAccessError(
      roles.length === 1 ? "Only the organization's owner can do this." : "Only the organization's owner or a manager can do this."
    );
  }
}

async function lockOrganization(tx: Prisma.TransactionClient, organizationId: string) {
  await tx.$queryRaw`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`;
}

async function notifyOwners(organizationId: string, message: string) {
  const owners = await prisma.organizationMembership.findMany({
    where: { organizationId, role: "OWNER", status: "APPROVED" },
    select: { userId: true },
  });
  await Promise.all(
    owners.map((owner) =>
      createNotification({ userId: owner.userId, notificationType: "KYC_STATUS", message, link: "/organization/verify" })
    )
  );
}

// ---------- the organization's side ----------

/**
 * Saves the business details and opens the document checklist. Only the owner can do this: it is
 * the owner's own verified identity that vouches for the business.
 */
export async function submitBusinessVerification(
  organizationId: string,
  ownerId: string,
  input: BusinessVerificationInput
): Promise<Result> {
  await requireApprovedMember(organizationId, ownerId, ["OWNER"]);

  const [organization, owner] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.user.findUnique({ where: { id: ownerId } }),
  ]);
  if (!organization || !owner) return { success: false, error: "Not found." };
  if (organization.verificationStatus === "VERIFIED") {
    return { success: false, error: "This organization is already verified." };
  }
  if (!owner.kycVerified) {
    return {
      success: false,
      error: "Verify your own identity first (Settings → Verify Identity) before verifying your business.",
    };
  }

  const submitted = await inTransaction(async (tx) => {
    await lockOrganization(tx, organizationId);
    // Only a fresh or rejected organization can (re)submit; one that is already collecting documents
    // or in review keeps what it has.
    const claimed = await tx.organization.updateMany({
      where: { id: organizationId, verificationStatus: { in: ["UNVERIFIED", "REJECTED"] } },
      data: {
        cacNumber: input.cacNumber,
        description: input.businessDescription,
        industry: input.industry,
        registrationType: input.registrationType,
        dateOfRegistration: new Date(input.dateOfRegistration),
        addressLine1: input.addressLine1,
        addressCity: input.city,
        addressState: input.state,
        verificationStatus: "AWAITING_DOCUMENTS",
        verificationSubmittedAt: new Date(),
        verificationFailedReason: null,
        verificationReviewedAt: null,
        verificationReviewedById: null,
      },
    });
    if (claimed.count !== 1) return false;

    const existing = await tx.organizationDocument.findMany({ where: { organizationId }, select: { documentType: true } });
    const missing = REQUIRED_TYPES.filter((type) => !existing.some((doc) => doc.documentType === type));
    if (missing.length > 0) {
      await tx.organizationDocument.createMany({ data: missing.map((documentType) => ({ organizationId, documentType })) });
    }
    return true;
  });

  if (!submitted) {
    return { success: false, error: "Your details have already been submitted. Upload the documents listed below." };
  }
  return { success: true };
}

/**
 * Records an uploaded file against one of the organization's required documents. When the last
 * missing document arrives, the organization moves to "in review".
 */
export async function attachOrganizationDocument(
  organizationId: string,
  userId: string,
  documentId: string,
  fileUrl: string
): Promise<Result & { sentForReview?: boolean }> {
  await requireApprovedMember(organizationId, userId, ["OWNER", "MANAGER"]);

  // The URL comes from the browser, so only addresses that our own storage could have issued are taken.
  if (!isAllowedDocumentUrl(fileUrl)) return { success: false, error: "That upload couldn't be used. Please upload the file again." };

  return inTransaction(async (tx) => {
    await lockOrganization(tx, organizationId);

    const organization = await tx.organization.findUnique({ where: { id: organizationId }, select: { verificationStatus: true } });
    if (organization?.verificationStatus !== "AWAITING_DOCUMENTS") {
      return { success: false, error: "Documents can't be changed right now." };
    }

    const document = await tx.organizationDocument.findFirst({
      where: { id: documentId, organizationId, documentType: { in: REQUIRED_TYPES } },
      select: { id: true },
    });
    if (!document) return { success: false, error: "Document not found." };

    await tx.organizationDocument.update({
      where: { id: documentId },
      data: { status: "UPLOADED", fileUrl, rejectionReason: null },
    });

    // Counted under the lock, so the upload that completes the set always sees every other upload.
    const outstanding = await tx.organizationDocument.count({
      where: { organizationId, documentType: { in: REQUIRED_TYPES }, status: { in: ["REQUIRED", "REJECTED"] } },
    });
    const complete = outstanding === 0;
    if (complete) {
      await tx.organization.update({ where: { id: organizationId }, data: { verificationStatus: "PENDING" } });
    }
    return { success: true, sentForReview: complete };
  });
}

// ---------- the admin's side ----------

/** Organizations an admin has to act on (in review) or is waiting on (collecting documents). */
export async function listOrganizationsForReview() {
  const organizations = await prisma.organization.findMany({
    where: { verificationStatus: { in: ["PENDING", "AWAITING_DOCUMENTS"] } },
    include: {
      documents: { where: { documentType: { in: REQUIRED_TYPES } }, orderBy: { documentType: "asc" } },
      memberships: {
        where: { role: "OWNER", status: "APPROVED" },
        include: { user: { select: { firstName: true, lastName: true, email: true, kycVerified: true } } },
      },
    },
  });
  // In review first (oldest submission first), then the ones still collecting documents.
  return organizations.sort((a, b) => {
    if (a.verificationStatus !== b.verificationStatus) return a.verificationStatus === "PENDING" ? -1 : 1;
    return (a.verificationSubmittedAt?.getTime() ?? 0) - (b.verificationSubmittedAt?.getTime() ?? 0);
  });
}

export async function countOrganizationsInReview(): Promise<number> {
  return prisma.organization.count({ where: { verificationStatus: "PENDING" } });
}

export async function approveOrganization(organizationId: string, adminId: string): Promise<Result> {
  const organization = await inTransaction(async (tx) => {
    await lockOrganization(tx, organizationId);
    const claimed = await tx.organization.updateMany({
      where: { id: organizationId, verificationStatus: "PENDING" },
      data: { verificationStatus: "VERIFIED", verificationFailedReason: null, verificationReviewedAt: new Date(), verificationReviewedById: adminId },
    });
    if (claimed.count !== 1) return null;
    await tx.organizationDocument.updateMany({
      where: { organizationId, documentType: { in: REQUIRED_TYPES }, status: "UPLOADED" },
      data: { status: "APPROVED", rejectionReason: null },
    });
    return tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } });
  });
  if (!organization) return { success: false, error: "This organization isn't waiting for review any more." };

  await notifyOwners(organizationId, `${organization.name} is now verified. Professionals can affiliate with it.`);
  return { success: true };
}

/** Sends one document back: the organization returns to collecting documents until it's replaced. */
export async function rejectOrganizationDocument(documentId: string, adminId: string, reason: string): Promise<Result> {
  const document = await prisma.organizationDocument.findUnique({
    where: { id: documentId },
    select: { organizationId: true, documentType: true, organization: { select: { name: true } } },
  });
  if (!document) return { success: false, error: "Document not found." };

  const outcome = await inTransaction(async (tx): Promise<"sent_back" | "not_in_review" | "not_uploaded"> => {
    await lockOrganization(tx, document.organizationId);
    // Checked under the lock, so a concurrent review of the same organization can't interleave.
    const current = await tx.organizationDocument.findUnique({ where: { id: documentId }, select: { status: true } });
    if (current?.status !== "UPLOADED") return "not_uploaded";
    const claimed = await tx.organization.updateMany({
      where: { id: document.organizationId, verificationStatus: "PENDING" },
      data: { verificationStatus: "AWAITING_DOCUMENTS", verificationReviewedAt: new Date(), verificationReviewedById: adminId },
    });
    if (claimed.count !== 1) return "not_in_review";
    await tx.organizationDocument.update({ where: { id: documentId }, data: { status: "REJECTED", rejectionReason: reason } });
    return "sent_back";
  });

  if (outcome === "not_uploaded") return { success: false, error: "That document isn't awaiting review." };
  if (outcome === "not_in_review") return { success: false, error: "This organization isn't waiting for review any more." };

  await notifyOwners(
    document.organizationId,
    `A document for ${document.organization.name} needs to be replaced: ${reason}`
  );
  return { success: true };
}

/** Turns the organization down. The owner sees the reason and can correct the details and submit again. */
export async function rejectOrganization(organizationId: string, adminId: string, reason: string): Promise<Result> {
  const organization = await inTransaction(async (tx) => {
    await lockOrganization(tx, organizationId);
    const claimed = await tx.organization.updateMany({
      where: { id: organizationId, verificationStatus: "PENDING" },
      data: { verificationStatus: "REJECTED", verificationFailedReason: reason, verificationReviewedAt: new Date(), verificationReviewedById: adminId },
    });
    if (claimed.count !== 1) return null;
    return tx.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { name: true } });
  });
  if (!organization) return { success: false, error: "This organization isn't waiting for review any more." };

  await notifyOwners(organizationId, `Verification for ${organization.name} was not approved: ${reason}`);
  return { success: true };
}
