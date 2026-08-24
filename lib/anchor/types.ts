// Anchor's API is JSON:API-shaped. These are minimal structural types covering only the
// fields this app actually reads/writes — not a full JSON:API client.

export interface AnchorResourceIdentifier {
  id: string;
  type: string;
}

export interface AnchorResource<Attrs = Record<string, unknown>> {
  id: string;
  type: string;
  attributes: Attrs;
  relationships?: Record<string, { data: AnchorResourceIdentifier | AnchorResourceIdentifier[] | null }>;
}

export interface AnchorDocument<Attrs = Record<string, unknown>> {
  data: AnchorResource<Attrs>;
  included?: AnchorResource[];
}

export interface AnchorListDocument<Attrs = Record<string, unknown>> {
  data: AnchorResource<Attrs>[];
  included?: AnchorResource[];
}

export interface AnchorErrorResponse {
  errors?: { title?: string; detail?: string; status?: string }[];
}

export class AnchorApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "AnchorApiError";
    this.status = status;
    this.body = body;
  }
}

/**
 * The real, human-readable reason an Anchor call failed. AnchorApiError.message is only ever
 * the generic "Anchor API error (STATUS) for METHOD PATH" wrapper set at the fetch call site
 * (see client.ts) — the actual detail (e.g. "Account number does not match account name")
 * lives in .body.errors[].detail. Every catch block that stores/logs/surfaces an Anchor
 * failure should use this instead of `err.message`, or every future failure ends up as an
 * indistinguishable generic string, the exact gap that made several production incidents
 * this session harder to diagnose than they needed to be.
 */
export function describeAnchorError(err: unknown): string {
  if (err instanceof AnchorApiError) {
    const body = err.body as AnchorErrorResponse | undefined;
    const details = body?.errors?.map((e) => e.detail || e.title).filter((v): v is string => !!v);
    if (details && details.length > 0) return details.join("; ");
  }
  return err instanceof Error ? err.message : "Unknown error";
}
