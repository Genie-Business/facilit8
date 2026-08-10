import type { Metadata } from "next";
import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
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
  PENDING: "Verification in progress",
  AWAITING_DOCUMENTS: "Documents needed",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export default async function OrganizationVerifyPage() {
  const session = await auth();
  if (!session) return null;

  const [membership, user] = await Promise.all([
    prisma.organizationMembership.findFirst({
      where: { userId: session.user.id, role: "OWNER", status: "APPROVED" },
      include: { organization: { include: { documents: true } } },
    }),
    prisma.user.findUnique({ where: { id: session.user.id } }),
  ]);

  if (!membership) {
    return (
      <div className="max-w-md space-y-2">
        <h1 className="text-2xl font-semibold">Business verification</h1>
        <p className="text-sm text-muted-foreground">
          You don&apos;t own an organization yet. Organizations are created automatically when you sign up
          as an Event Manager with an organization name.
        </p>
      </div>
    );
  }

  const organization = membership.organization;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Business verification</h1>
        <p className="text-sm text-muted-foreground">
          Verify {organization.name} with your CAC/RC number. Professionals can only affiliate with
          verified organizations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Status
            <Badge
              variant={
                organization.verificationStatus === "VERIFIED"
                  ? "secondary"
                  : organization.verificationStatus === "REJECTED"
                    ? "destructive"
                    : "outline"
              }
            >
              {STATUS_LABEL[organization.verificationStatus]}
            </Badge>
          </CardTitle>
        </CardHeader>
        {organization.verificationFailedReason && (
          <CardContent>
            <p className="text-sm text-destructive">{organization.verificationFailedReason}</p>
          </CardContent>
        )}
      </Card>

      {organization.verificationStatus === "UNVERIFIED" &&
        (!user?.kycVerified || !user.bvn ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Verify your own identity first</CardTitle>
              <CardDescription>
                Business verification uses your own BVN as the business owner&apos;s identity check.
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
              <CardTitle className="text-base">Business details</CardTitle>
            </CardHeader>
            <CardContent>
              <BusinessVerificationForm organizationId={organization.id} />
            </CardContent>
          </Card>
        ))}

      {(organization.verificationStatus === "AWAITING_DOCUMENTS" ||
        organization.documents.length > 0) &&
        organization.verificationStatus !== "UNVERIFIED" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Documents</CardTitle>
              <CardDescription>Upload each document Anchor requires for your business type.</CardDescription>
            </CardHeader>
            <CardContent>
              {organization.documents.length === 0 ? (
                <p className="text-sm text-muted-foreground">Waiting on Anchor to list required documents...</p>
              ) : (
                organization.documents.map((doc) => (
                  <OrganizationDocumentRow
                    key={doc.id}
                    organizationId={organization.id}
                    anchorDocumentId={doc.anchorDocumentId}
                    documentType={doc.documentType}
                    status={doc.status}
                    rejectionReason={doc.rejectionReason}
                  />
                ))
              )}
            </CardContent>
          </Card>
        )}
    </div>
  );
}
