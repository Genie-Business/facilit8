-- CreateEnum
CREATE TYPE "BusinessRegistrationType" AS ENUM ('PRIVATE_INCORPORATED', 'INCORPORATED_TRUSTEES', 'BUSINESS_NAME', 'FREE_ZONE', 'GOV', 'PRIVATE_INCORPORATED_GOV', 'COOPERATIVE_SOCIETY', 'PUBLIC_INCORPORATED');

-- CreateEnum
CREATE TYPE "OrgVerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'AWAITING_DOCUMENTS', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrgDocumentStatus" AS ENUM ('REQUIRED', 'UPLOADED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "addressCity" TEXT,
ADD COLUMN     "addressLine1" TEXT,
ADD COLUMN     "addressState" TEXT,
ADD COLUMN     "anchorBusinessCustomerId" TEXT,
ADD COLUMN     "cacNumber" TEXT,
ADD COLUMN     "dateOfRegistration" TIMESTAMP(3),
ADD COLUMN     "registrationType" "BusinessRegistrationType",
ADD COLUMN     "verificationFailedReason" TEXT,
ADD COLUMN     "verificationStatus" "OrgVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED';

-- CreateTable
CREATE TABLE "OrganizationDocument" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "anchorDocumentId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "status" "OrgDocumentStatus" NOT NULL DEFAULT 'REQUIRED',
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationDocument_anchorDocumentId_key" ON "OrganizationDocument"("anchorDocumentId");

-- CreateIndex
CREATE INDEX "OrganizationDocument_organizationId_idx" ON "OrganizationDocument"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_anchorBusinessCustomerId_key" ON "Organization"("anchorBusinessCustomerId");

-- AddForeignKey
ALTER TABLE "OrganizationDocument" ADD CONSTRAINT "OrganizationDocument_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
