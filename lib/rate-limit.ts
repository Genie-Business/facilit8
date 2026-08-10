import { headers } from "next/headers";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

async function getClientIp(): Promise<string> {
  const hdrs = await headers();
  const forwardedFor = hdrs.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return hdrs.get("x-real-ip") ?? "unknown";
}

function sweepExpired(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

/**
 * Per-IP fixed-window limiter, held in the function instance's memory. Not shared across
 * concurrent serverless instances or survivable across cold starts — a soft deterrent
 * against bots/accidental double-submits, not a hard guarantee. A durable store (e.g.
 * Upstash Redis) would be needed for stronger guarantees; not adopted here to avoid a new
 * service dependency before it's needed.
 */
export async function isRateLimited(action: string, limit: number, windowMs: number): Promise<boolean> {
  const ip = await getClientIp();
  const key = `${action}:${ip}`;
  const now = Date.now();

  if (buckets.size > 5000) sweepExpired(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  if (bucket.count >= limit) return true;
  bucket.count += 1;
  return false;
}

export const RATE_LIMITS = {
  signup: { limit: 5, windowMs: 60 * 60 * 1000 },
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  passwordReset: { limit: 5, windowMs: 60 * 60 * 1000 },
  contact: { limit: 5, windowMs: 60 * 60 * 1000 },
  newsletter: { limit: 5, windowMs: 60 * 60 * 1000 },
} as const;

export const RATE_LIMIT_MESSAGE = "Too many attempts. Please try again later.";
