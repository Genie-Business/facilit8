"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { uploadOrganizationDocumentAction } from "@/lib/actions/business-verification.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const DOCUMENT_LABELS: Record<string, string> = {
  RC_NUMBER: "RC Number",
  TIN: "Tax Identification Number",
  FORM_CAC_3: "Form CAC 3 (registered address)",
  CERTIFICATE_OF_INCORPORATION: "Certificate of Incorporation",
  PROOF_OF_ADDRESS: "Proof of Address",
};

const STATUS_VARIANT: Record<string, "secondary" | "outline" | "destructive"> = {
  APPROVED: "secondary",
  UPLOADED: "outline",
  REQUIRED: "outline",
  REJECTED: "destructive",
};

export function OrganizationDocumentRow({
  organizationId,
  anchorDocumentId,
  documentType,
  status,
  rejectionReason,
}: {
  organizationId: string;
  anchorDocumentId: string;
  documentType: string;
  status: string;
  rejectionReason?: string | null;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const needsUpload = status === "REQUIRED" || status === "REJECTED";

  function submit() {
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadOrganizationDocumentAction(organizationId, anchorDocumentId, formData);
      if (result.error) setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b py-3 last:border-b-0">
      <div>
        <p className="text-sm font-medium">{DOCUMENT_LABELS[documentType] ?? documentType}</p>
        {rejectionReason && <p className="text-xs text-destructive">{rejectionReason}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex items-center gap-2">
        {needsUpload ? (
          <>
            <input
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="text-xs"
            />
            <Button size="sm" onClick={submit} disabled={pending}>
              {pending ? "Uploading..." : "Upload"}
            </Button>
          </>
        ) : (
          <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{status}</Badge>
        )}
      </div>
    </div>
  );
}
