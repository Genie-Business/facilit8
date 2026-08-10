import { prisma } from "@/lib/db";
import {
  createBusinessCustomer,
  submitBusinessVerification as triggerAnchorKyb,
  uploadBusinessDocument,
} from "@/lib/anchor/business";
import type { BusinessVerificationInput } from "@/lib/validation/business";

interface Result {
  success: boolean;
  error?: string;
}

async function requireApprovedOwner(organizationId: string, userId: string) {
  const membership = await prisma.organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
  });
  if (!membership || membership.role !== "OWNER" || membership.status !== "APPROVED") {
    throw new Error("Only the organization's owner can manage business verification.");
  }
}

/**
 * Submits CAC/business details and creates+triggers the Anchor BusinessCustomer. The
 * submitting owner's own completed individual KYC (BVN/DOB/gender) doubles as the
 * business's required OWNER-officer KYC — Anchor requires at least one officer's personal
 * details on every business customer, and an org owner genuinely is one.
 */
export async function submitBusinessVerification(
  organizationId: string,
  ownerId: string,
  input: BusinessVerificationInput
): Promise<Result> {
  await requireApprovedOwner(organizationId, ownerId);

  const [organization, owner] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.user.findUnique({ where: { id: ownerId } }),
  ]);
  if (!organization || !owner) return { success: false, error: "Not found." };
  if (organization.verificationStatus === "VERIFIED") {
    return { success: false, error: "This organization is already verified." };
  }
  if (!owner.kycVerified || !owner.bvn || !owner.dateOfBirth || !owner.gender) {
    return {
      success: false,
      error: "Verify your own identity first (Settings → Verify Identity) before verifying your business.",
    };
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: {
      cacNumber: input.cacNumber,
      businessBvn: input.businessBvn,
      description: input.businessDescription,
      industry: input.industry,
      registrationType: input.registrationType,
      dateOfRegistration: new Date(input.dateOfRegistration),
      addressLine1: input.addressLine1,
      addressCity: input.city,
      addressState: input.state,
      verificationFailedReason: null,
    },
  });

  try {
    const customerId = await createBusinessCustomer({
      organizationId,
      businessName: organization.name,
      businessDescription: input.businessDescription,
      businessBvn: input.businessBvn,
      industry: input.industry,
      registrationType: input.registrationType,
      dateOfRegistration: input.dateOfRegistration,
      addressLine1: input.addressLine1,
      city: input.city,
      state: input.state,
      officer: {
        firstName: owner.firstName,
        lastName: owner.lastName,
        email: owner.email,
        phoneNumber: owner.mobilePhone,
        bvn: owner.bvn,
        dateOfBirth: owner.dateOfBirth.toISOString().slice(0, 10),
        gender: owner.gender,
        state: owner.state ?? input.state,
      },
    });

    await prisma.organization.update({
      where: { id: organizationId },
      data: { anchorBusinessCustomerId: customerId, verificationStatus: "PENDING" },
    });

    await triggerAnchorKyb(customerId);
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Business verification failed to start.";
    await prisma.organization.update({
      where: { id: organizationId },
      data: { verificationFailedReason: message },
    });
    return { success: false, error: message };
  }
}

export async function uploadOrganizationDocument(
  organizationId: string,
  ownerId: string,
  anchorDocumentId: string,
  file: File
): Promise<Result> {
  await requireApprovedOwner(organizationId, ownerId);

  const [organization, document] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.organizationDocument.findUnique({ where: { anchorDocumentId } }),
  ]);
  if (!organization?.anchorBusinessCustomerId || !document || document.organizationId !== organizationId) {
    return { success: false, error: "Document not found." };
  }

  try {
    await uploadBusinessDocument(organization.anchorBusinessCustomerId, anchorDocumentId, { fileData: file });
    await prisma.organizationDocument.update({
      where: { anchorDocumentId },
      data: { status: "UPLOADED", rejectionReason: null },
    });
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed.";
    return { success: false, error: message };
  }
}
