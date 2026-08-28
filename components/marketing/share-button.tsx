"use client";

import { useState } from "react";
import { Share2, Check } from "lucide-react";

export function ShareButton({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // User cancelled the share sheet, or the platform rejected it — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (very old browser, non-secure context) — nothing more we
      // can do without a visible fallback UI; the button simply won't confirm.
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex items-center gap-2 rounded-full border border-border bg-white px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:border-brand"
    >
      {copied ? (
        <>
          <Check className="size-4 text-brand" />
          Link copied
        </>
      ) : (
        <>
          <Share2 className="size-4" />
          Share
        </>
      )}
    </button>
  );
}
