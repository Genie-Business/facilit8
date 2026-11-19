import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";

import { DOCUMENT_LABELS, listOrganizationsForReview } from "@/lib/services/business-verification.service";
import { REGISTRATION_TYPE_LABELS, formatIndustryLabel } from "@/lib/validation/business";
import { ApproveOrganizationForm, RejectWithReasonForm } from "@/components/admin/review-organization-forms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Organizations",
  robots: { index: false, follow: false },
};

const DOCUMENT_BADGE: Record<string, "secondary" | "outline" | "destructive"> = {
  APPROVED: "secondary",
  UPLOADED: "outline",
  REQUIRED: "outline",
  REJECTED: "destructive",
};

const DOCUMENT_STATUS_LABEL: Record<string, string> = {
  REQUIRED: "Not uploaded",
  UPLOADED: "Uploaded",
  APPROVED: "Approved",
  REJECTED: "Sent back",
};

const formatDate = (date: Date | null) =>
  date ? date.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";

export default async function AdminOrganizationsPage() {
  const organizations = await listOrganizationsForReview();
  const inReview = organizations.filter((organization) => organization.verificationStatus === "PENDING");
  const collecting = organizations.filter((organization) => organization.verificationStatus === "AWAITING_DOCUMENTS");

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Organizations</h1>
        <p className="text-muted-foreground">
          Review each organization&apos;s CAC details and documents against the CAC public register. Approving makes it
          verified, so professionals can affiliate with it; you can also send a single document back, or turn the
          whole submission down, with a reason the owner will see.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">In review</CardTitle>
          <CardDescription>{inReview.length} waiting for a decision</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {inReview.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing waiting for review.</p>
          ) : (
            inReview.map((organization) => {
              const owner = organization.memberships[0]?.user;
              return (
                <div key={organization.id} className="space-y-4 rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{organization.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Submitted {formatDate(organization.verificationSubmittedAt)}
                      {owner && ` by ${owner.firstName} ${owner.lastName} (${owner.email})${owner.kycVerified ? "" : " — identity not verified"}`}
                    </p>
                  </div>

                  <dl className="grid !grid-cols-1 !gap-x-6 !gap-y-1 text-sm sm:!grid-cols-2">
                    <div>
                      <dt className="text-muted-foreground">CAC / RC number</dt>
                      <dd>{organization.cacNumber ?? "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Registration type</dt>
                      <dd>{organization.registrationType ? REGISTRATION_TYPE_LABELS[organization.registrationType] : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Registered on</dt>
                      <dd>{formatDate(organization.dateOfRegistration)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Industry</dt>
                      <dd>{organization.industry ? formatIndustryLabel(organization.industry) : "—"}</dd>
                    </div>
                    <div className="sm:!col-span-2">
                      <dt className="text-muted-foreground">Address</dt>
                      <dd>
                        {[organization.addressLine1, organization.addressCity, organization.addressState].filter(Boolean).join(", ") || "—"}
                      </dd>
                    </div>
                    {organization.description && (
                      <div className="sm:!col-span-2">
                        <dt className="text-muted-foreground">What they do</dt>
                        <dd>{organization.description}</dd>
                      </div>
                    )}
                  </dl>

                  <div className="space-y-3">
                    {organization.documents.map((document) => (
                      <div key={document.id} className="space-y-2 rounded-md border p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{DOCUMENT_LABELS[document.documentType] ?? document.documentType}</span>
                            <Badge variant={DOCUMENT_BADGE[document.status] ?? "outline"}>
                              {DOCUMENT_STATUS_LABEL[document.status] ?? document.status}
                            </Badge>
                          </div>
                          {document.fileUrl && (
                            <a
                              href={document.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm underline underline-offset-4"
                            >
                              Open file
                              <ExternalLink className="size-3" />
                            </a>
                          )}
                        </div>
                        {document.status === "UPLOADED" && (
                          <RejectWithReasonForm
                            idField="documentId"
                            id={document.id}
                            action="document"
                            placeholder="What's wrong with this document? The owner will see this."
                            buttonLabel="Send this document back"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="grid !grid-cols-1 !gap-4 border-t pt-4 sm:!grid-cols-2">
                    <ApproveOrganizationForm organizationId={organization.id} />
                    <RejectWithReasonForm
                      idField="organizationId"
                      id={organization.id}
                      action="organization"
                      placeholder="Why is this organization not approved? The owner will see this."
                      buttonLabel="Reject organization"
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Collecting documents</CardTitle>
          <CardDescription>{collecting.length} still uploading, or replacing a document you sent back</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {collecting.length === 0 ? (
            <p className="text-sm text-muted-foreground">None.</p>
          ) : (
            collecting.map((organization) => {
              const owner = organization.memberships[0]?.user;
              const missing = organization.documents.filter((document) => document.status === "REQUIRED" || document.status === "REJECTED").length;
              return (
                <div key={organization.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                  <div>
                    <p className="font-medium">{organization.name}</p>
                    {owner && <p className="text-muted-foreground">{owner.firstName} {owner.lastName} · {owner.email}</p>}
                  </div>
                  <Badge variant="outline">{missing} document{missing === 1 ? "" : "s"} outstanding</Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
