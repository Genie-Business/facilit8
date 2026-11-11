"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { ExternalLink } from "lucide-react";

import { attachOrganizationDocumentAction } from "@/lib/actions/business-verification.actions";
import { ORGANIZATION_DOCUMENT_CONTENT_TYPES } from "@/lib/storage/blob";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_LABEL: Record<string, string> = {
  REQUIRED: "Needed",
  UPLOADED: "Uploaded",
  APPROVED: "Approved",
  REJECTED: "Needs replacing",
};

const STATUS_VARIANT: Record<string, "secondary" | "outline" | "destructive"> = {
  APPROVED: "secondary",
  UPLOADED: "outline",
  REQUIRED: "outline",
  REJECTED: "destructive",
};

export function OrganizationDocumentRow({
  organizationId,
  documentId,
  label,
  status,
  fileUrl,
  rejectionReason,
  canUpload,
}: {
  organizationId: string;
  documentId: string;
  label: string;
  status: string;
  fileUrl?: string | null;
  rejectionReason?: string | null;
  /** False once the documents are with the reviewer or the organization is verified. */
  canUpload: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const busy = uploading || pending;
  // An uploaded file can be swapped until the whole set goes to review; a missing or sent-back one needs a file.
  const showUploader = canUpload && status !== "APPROVED";

  async function submit() {
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: "organization-document",
      });
      startTransition(async () => {
        const result = await attachOrganizationDocumentAction(organizationId, documentId, blob.url);
        if (result.error) setError(result.error);
        else setFile(null);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 border-b py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium">{label}</p>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-muted-foreground underline underline-offset-4"
          >
            View uploaded file
            <ExternalLink className="size-3" />
          </a>
        )}
        {status === "REJECTED" && rejectionReason && <p className="text-xs text-destructive">{rejectionReason}</p>}
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_VARIANT[status] ?? "outline"}>{STATUS_LABEL[status] ?? status}</Badge>
        {showUploader && (
          <>
            <input
              type="file"
              accept={ORGANIZATION_DOCUMENT_CONTENT_TYPES.join(",")}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              disabled={busy}
              className="max-w-52 text-xs"
            />
            <Button size="sm" onClick={submit} disabled={busy || !file}>
              {busy ? "Uploading..." : status === "UPLOADED" ? "Replace" : "Upload"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
