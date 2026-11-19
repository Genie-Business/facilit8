-- Organization verification (KYB) becomes a manual review by an admin instead of an Anchor Business
-- customer. Purely additive: Anchor's id columns stay (nullable / unused) so nothing is dropped.

-- Documents are now uploaded to our own storage, so they no longer carry an Anchor document id.
ALTER TABLE "OrganizationDocument" ALTER COLUMN "anchorDocumentId" DROP NOT NULL;
ALTER TABLE "OrganizationDocument" ADD COLUMN "fileUrl" TEXT;

-- When a review was requested, and who decided it and when.
ALTER TABLE "Organization" ADD COLUMN "verificationSubmittedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "verificationReviewedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN "verificationReviewedById" TEXT;
