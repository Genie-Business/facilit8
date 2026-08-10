"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";

import { Label } from "@/components/ui/label";
import { PROFILE_IMAGE_CONTENT_TYPES } from "@/lib/storage/blob";

export function ImageUploadField({
  name,
  label,
  defaultUrl,
  shape = "circle",
}: {
  name: string;
  label: string;
  defaultUrl?: string | null;
  shape?: "circle" | "square";
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
      });
      setUrl(blob.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. You can add this later from your profile.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={`${name}-input`}>{label}</Label>
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className={`size-14 border border-border object-cover ${shape === "circle" ? "rounded-full" : "rounded-lg"}`}
          />
        ) : (
          <div
            className={`flex size-14 items-center justify-center border border-dashed border-border text-xs text-muted-foreground ${shape === "circle" ? "rounded-full" : "rounded-lg"}`}
          >
            None
          </div>
        )}
        <input
          id={`${name}-input`}
          type="file"
          accept={PROFILE_IMAGE_CONTENT_TYPES.join(",")}
          onChange={handleChange}
          disabled={uploading}
          className="text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border file:border-input file:bg-transparent file:px-2.5 file:py-1 file:text-sm file:font-medium file:text-foreground"
        />
      </div>
      <input type="hidden" name={name} value={url ?? ""} />
      {uploading && <p className="text-sm text-muted-foreground">Uploading...</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
