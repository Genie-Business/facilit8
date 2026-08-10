import { AnchorApiError } from "./types";

function baseUrl(): string {
  const url = process.env.ANCHOR_BASE_URL;
  if (!url) throw new Error("ANCHOR_BASE_URL is not configured.");
  return url;
}

function secretKey(): string {
  const key = process.env.ANCHOR_SECRET_KEY;
  if (!key) throw new Error("ANCHOR_SECRET_KEY is not configured.");
  return key;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  timeoutMs?: number;
}

/**
 * Thin fetch wrapper around Anchor's REST API. Endpoint shapes for accounts/transfers are
 * confirmed against the original Django integration (see plan §6); customer/counterparty
 * endpoints follow the same JSON:API conventions Anchor uses elsewhere but weren't directly
 * observed in the old codebase — verify against Anchor's docs/sandbox once credentials are
 * available.
 */
export async function anchorRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, timeoutMs = 30_000 } = options;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl()}${path}`, {
      method,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "x-anchor-key": secretKey(),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    const text = await response.text();
    const json = text ? JSON.parse(text) : null;

    if (!response.ok) {
      throw new AnchorApiError(`Anchor API error (${response.status}) for ${method} ${path}`, response.status, json);
    }

    return json as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Multipart upload for KYB documents (`POST /documents/upload-document/{customerId}/{documentId}`).
 * Separate from anchorRequest because that always sends JSON — Anchor's document upload
 * endpoint expects multipart/form-data with `fileData` (the file) and/or `textData` (used
 * for text-only document types like RC_NUMBER/TIN, per
 * https://docs.getanchor.co/docs/business-customer-kyb).
 */
export async function anchorUpload<T>(
  path: string,
  fields: { fileData?: Blob; textData?: string }
): Promise<T> {
  const form = new FormData();
  if (fields.fileData) form.set("fileData", fields.fileData);
  if (fields.textData !== undefined) form.set("textData", fields.textData);

  const response = await fetch(`${baseUrl()}${path}`, {
    method: "POST",
    headers: { accept: "application/json", "x-anchor-key": secretKey() },
    body: form,
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new AnchorApiError(`Anchor API error (${response.status}) for POST ${path}`, response.status, json);
  }

  return json as T;
}

/** Converts a Naira amount to the integer kobo value Anchor's API expects. */
export function nairaToKobo(amount: number): number {
  return Math.round(amount * 100);
}

/** Converts an integer kobo value from Anchor's API back to Naira. */
export function koboToNaira(kobo: number): number {
  return kobo / 100;
}
