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
