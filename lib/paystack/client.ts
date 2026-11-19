// Thin fetch wrapper around Paystack's REST API. Everything that talks to Paystack goes through
// here, and endpoint shapes live in api.ts, so if one of them is wrong (these were written from
// Paystack's docs and have not yet run against a live test key) there is exactly one place to fix.

export class PaystackNotConfiguredError extends Error {
  constructor() {
    super("PAYSTACK_SECRET_KEY is not configured.");
  }
}

/**
 * `kind` is the part that matters for money: "api" means Paystack answered (and `status` says
 * how), "network" means we don't know whether the request arrived at all — a timeout can happen
 * after Paystack has already accepted a transfer.
 */
export class PaystackApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
    public readonly kind: "api" | "network" = "api"
  ) {
    super(message);
  }
}

/**
 * True only when Paystack clearly refused the request, so it is safe to assume nothing happened
 * (a 4xx other than 408). A network failure, a timeout or a 5xx is NOT definitive: the transfer
 * may well have been created, and the only safe move is to ask Paystack by reference later.
 */
export function isDefinitiveFailure(err: unknown): boolean {
  return err instanceof PaystackApiError && err.kind === "api" && err.status >= 400 && err.status < 500 && err.status !== 408;
}

export function describePaystackError(err: unknown): string {
  if (err instanceof PaystackApiError) return err.message;
  return err instanceof Error ? err.message : "Unknown error";
}

export function isPaystackConfigured(): boolean {
  return !!process.env.PAYSTACK_SECRET_KEY;
}

export function isPaystackTestMode(): boolean {
  return (process.env.PAYSTACK_SECRET_KEY ?? "").startsWith("sk_test_");
}

function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaystackNotConfiguredError();
  return key;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  timeoutMs?: number;
}

interface Envelope<T> {
  status?: boolean;
  message?: string;
  data?: T;
  meta?: unknown;
}

export async function paystackRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, timeoutMs = 30_000 } = options;

  const url = new URL(`${process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co"}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        authorization: `Bearer ${secretKey()}`,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof PaystackNotConfiguredError) throw err;
    throw new PaystackApiError("We couldn't reach Paystack. Please try again in a moment.", 0, null, "network");
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let json: Envelope<T> | null = null;
  try {
    json = text ? (JSON.parse(text) as Envelope<T>) : null;
  } catch {
    // A non-JSON body (an HTML error page from a proxy, say) — handled below by its status code.
  }

  if (!response.ok || json?.status === false) {
    throw new PaystackApiError(json?.message || `Paystack error (${response.status})`, response.status, json);
  }
  return (json?.data ?? (json as unknown)) as T;
}

/** Like paystackRequest, but also returns the response's `meta` block (pagination). */
export async function paystackRequestWithMeta<T>(path: string, query?: RequestOptions["query"]): Promise<{ data: T; meta: Record<string, unknown> | null }> {
  const url = new URL(`${process.env.PAYSTACK_BASE_URL ?? "https://api.paystack.co"}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) if (value !== undefined) url.searchParams.set(key, String(value));

  let response: Response;
  try {
    response = await fetch(url, { headers: { authorization: `Bearer ${secretKey()}`, accept: "application/json" } });
  } catch (err) {
    if (err instanceof PaystackNotConfiguredError) throw err;
    throw new PaystackApiError("We couldn't reach Paystack. Please try again in a moment.", 0, null, "network");
  }
  const json = (await response.json().catch(() => null)) as Envelope<T> | null;
  if (!response.ok || json?.status === false) {
    throw new PaystackApiError(json?.message || `Paystack error (${response.status})`, response.status, json);
  }
  return { data: json?.data as T, meta: (json?.meta as Record<string, unknown>) ?? null };
}
