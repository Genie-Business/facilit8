"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { FileText, ExternalLink } from "lucide-react";

import { Label } from "@/components/ui/label";
import { PROFILE_DOCUMENT_CONTENT_TYPES } from "@/lib/storage/blob";

export function DocumentUploadField({
  name,
  label,
  defaultUrl,
}: {
  name: string;
  label: string;
  defaultUrl?: string | null;
}) {
  const [url, setUrl] = useState<string | null>(defaultUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        clientPayload: "document",
      });
      setUrl(blob.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${name}-input`}>{label}</Label>
      <div className="flex items-center gap-3">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-foreground underline underline-offset-4"
          >
            <FileText className="size-4" />
            Current file
            <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileText className="size-4" />
            None uploaded
          </span>
        )}
      </div>
      <input
        id={`${name}-input`}
        type="file"
        accept={PROFILE_DOCUMENT_CONTENT_TYPES.join(",")}
        onChange={handleChange}
        disabled={uploading}
        className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-input file:bg-transparent file:px-2.5 file:py-1 file:text-sm file:font-medium file:text-foreground"
      />
      <input type="hidden" name={name} value={url ?? ""} />
      {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
