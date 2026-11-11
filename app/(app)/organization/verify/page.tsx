import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { DOCUMENT_LABELS, REQUIRED_DOCUMENT_TYPES } from "@/lib/services/business-verification.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BusinessVerificationForm } from "@/components/business/business-verification-form";
import { OrganizationDocumentRow } from "@/components/business/organization-document-row";

export const metadata: Metadata = {
  title: "Business Verification",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, string> = {
  UNVERIFIED: "Not started",
  PENDING: "In review",
  AWAITING_DOCUMENTS: "Documents needed",
  VERIFIED: "Verified",
  REJECTED: "Not approved",
};

export default async function OrganizationVerifyPage() {
  const session = await auth();
  if (!session) return null;

  const [membership, user] = await Promise.all([
    // MANAGER can view status and handle document uploads once verification is underway,
    // but NOT submit the initial details (below) — that step is vouched for by the owner's own
    // verified identity, so it has to stay OWNER-only or a teammate would be vouching for a
    // business they don't own.
    prisma.organizationMembership.findFirst({
      where: { userId: session.user.id, role: { in: ["OWNER", "MANAGER"] }, status: "APPROVED" },
      include: {
        organization: {
          include: {
            documents: { where: { documentType: { in: [...REQUIRED_DOCUMENT_TYPES] } }, orderBy: { documentType: "asc" } },
          },
        },
      },
    }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
  ]);

  if (!membership) {
    return (
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold">Business verification</h1>
        <p className="text-sm text-muted-foreground">
          You don&apos;t belong to an organization yet. Organizations are created automatically when you sign up
          as an Event Manager with an organization name.
        </p>
      </div>
    );
  }

  const isOwner = membership.role === "OWNER";

  const organization = membership.organization;
  const status = organization.verificationStatus;
  const canSubmitDetails = status === "UNVERIFIED" || status === "REJECTED";

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Business verification</h1>
        <p className="text-sm text-muted-foreground">
          Verify {organization.name} with your CAC/RC number and registration documents. Our team reviews every
          submission. Professionals can only affiliate with verified organizations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Status
            <Badge variant={status === "VERIFIED" ? "secondary" : status === "REJECTED" ? "destructive" : "outline"}>
              {STATUS_LABEL[status]}
            </Badge>
          </CardTitle>
        </CardHeader>
        {organization.verificationFailedReason && (
          <CardContent>
            <p className="text-sm text-destructive">{organization.verificationFailedReason}</p>
          </CardContent>
        )}
      </Card>

      {canSubmitDetails &&
        (!isOwner ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Waiting on the owner</CardTitle>
              <CardDescription>
                Only the organization owner can submit the business details — their own verified identity vouches
                for the business.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : !user?.kycVerified ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verify your own identity first</CardTitle>
              <CardDescription>
                Business verification relies on your own verified identity, so complete that first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button render={<Link href="/settings/kyc" />} nativeButton={false}>
                Verify identity
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {status === "REJECTED" ? "Correct your business details" : "Business details"}
              </CardTitle>
              {status === "REJECTED" && (
                <CardDescription>Fix what the reviewer pointed out above, then submit again.</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <BusinessVerificationForm organizationId={organization.id} />
            </CardContent>
          </Card>
        ))}

      {!canSubmitDetails && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents</CardTitle>
            <CardDescription>
              {status === "AWAITING_DOCUMENTS"
                ? "Upload each document (PDF, JPG or PNG, up to 10 MB). Once all are in, they go to our team for review."
                : status === "PENDING"
                  ? "All documents are in and with our team for review. You'll be notified of the outcome."
                  : "These documents were approved."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {organization.documents.map((doc) => (
              <OrganizationDocumentRow
                key={doc.id}
                organizationId={organization.id}
                documentId={doc.id}
                label={DOCUMENT_LABELS[doc.documentType] ?? doc.documentType}
                status={doc.status}
                fileUrl={doc.fileUrl}
                rejectionReason={doc.rejectionReason}
                canUpload={status === "AWAITING_DOCUMENTS"}
              />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
