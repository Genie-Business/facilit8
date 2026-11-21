"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";

import { Button } from "@/components/ui/button";

type CopyState = "idle" | "copied" | "failed";

/** Copies text to the clipboard, with a fallback for pages where the async clipboard API isn't available. */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Permission denied or an insecure context: fall through to the older method.
  }
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}

/**
 * A button that copies `value` and says so: the icon turns into a tick and the label into "Copied" for
 * two seconds, and screen readers are told through a polite live region. `iconOnly` makes it a compact
 * square (give it a `label` so it still has an accessible name, e.g. "Copy account number").
 */
export function CopyButton({
  value,
  label = "Copy",
  iconOnly = false,
  variant = "outline",
  size = "sm",
  className,
}: {
  value: string;
  label?: string;
  iconOnly?: boolean;
  variant?: "default" | "outline" | "secondary" | "ghost";
  size?: "xs" | "sm" | "default" | "lg";
  className?: string;
}) {
  const [state, setState] = useState<CopyState>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    const ok = await writeToClipboard(value);
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }

  const text = state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : label;
  const Icon = state === "copied" ? Check : Copy;
  const iconSize = iconOnly ? ({ xs: "icon-xs", sm: "icon-sm", default: "icon", lg: "icon-lg" } as const)[size] : size;

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={iconOnly ? iconSize : size}
        onClick={copy}
        aria-label={iconOnly ? text : undefined}
        title={iconOnly ? text : undefined}
        className={className}
      >
        <Icon aria-hidden="true" className={state === "copied" ? "text-emerald-600" : undefined} />
        {!iconOnly && text}
      </Button>
      <span role="status" className="sr-only">
        {state === "copied" ? "Copied to clipboard" : state === "failed" ? "Couldn't copy to the clipboard" : ""}
      </span>
    </>
  );
}
