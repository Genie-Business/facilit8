// Pure date-range logic for the admin analytics page. No database access, so it's cheap to
// test. Every "day" and "month" here is a Lagos calendar day/month: the platform is Nigerian
// and Nigeria has no daylight saving, so Lagos is a fixed UTC+1 — a signup at 23:30 UTC on the
// 4th is the 5th, and should count as the 5th.

export type RangeKey = "7d" | "30d" | "90d" | "12m" | "all";
export type Granularity = "day" | "month";

export const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
  { key: "12m", label: "Last 12 months" },
  { key: "all", label: "All time" },
];
export const DEFAULT_RANGE: RangeKey = "30d";

export function parseRange(value: string | string[] | undefined): RangeKey {
  const raw = Array.isArray(value) ? value[0] : value;
  return RANGE_OPTIONS.some((option) => option.key === raw) ? (raw as RangeKey) : DEFAULT_RANGE;
}

export interface DateWindow {
  from: Date;
  to: Date;
}

export interface ResolvedRange extends DateWindow {
  key: RangeKey;
  label: string;
  /** The window of equal length immediately before this one; null for "all time". */
  previous: DateWindow | null;
  granularity: Granularity;
  /** Every bucket key in the window, oldest first, so charts can show empty days as zero. */
  buckets: string[];
}

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const LAGOS_OFFSET_MS = HOUR_MS;
const MAX_DAILY_BUCKETS = 92;

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function lagosParts(date: Date) {
  const shifted = new Date(date.getTime() + LAGOS_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
}

export function startOfLagosDay(date: Date): Date {
  const { year, month, day } = lagosParts(date);
  return new Date(Date.UTC(year, month, day) - LAGOS_OFFSET_MS);
}

export function startOfLagosMonth(date: Date): Date {
  const { year, month } = lagosParts(date);
  return new Date(Date.UTC(year, month, 1) - LAGOS_OFFSET_MS);
}

function addLagosMonths(monthStart: Date, months: number): Date {
  const { year, month } = lagosParts(monthStart);
  return new Date(Date.UTC(year, month + months, 1) - LAGOS_OFFSET_MS);
}

/** "2026-11-05" for a day bucket, "2026-11" for a month bucket — the same keys the SQL emits. */
export function bucketKey(date: Date, granularity: Granularity): string {
  const iso = new Date(date.getTime() + LAGOS_OFFSET_MS).toISOString();
  return granularity === "day" ? iso.slice(0, 10) : iso.slice(0, 7);
}

export function buildBuckets(from: Date, to: Date, granularity: Granularity): string[] {
  const keys: string[] = [];
  if (granularity === "day") {
    for (let cursor = startOfLagosDay(from); cursor < to; cursor = new Date(cursor.getTime() + DAY_MS)) {
      keys.push(bucketKey(cursor, "day"));
    }
  } else {
    for (let cursor = startOfLagosMonth(from); cursor < to; cursor = addLagosMonths(cursor, 1)) {
      keys.push(bucketKey(cursor, "month"));
    }
  }
  return keys;
}

/** "5 Nov" for a day, "Nov 2026" for a month. */
export function bucketLabel(bucket: string, granularity: Granularity): string {
  const [year, month, day] = bucket.split("-");
  const name = MONTH_NAMES[Number(month) - 1] ?? month;
  return granularity === "day" ? `${Number(day)} ${name}` : `${name} ${year}`;
}

/**
 * `earliest` is only used by "all time" (the oldest record, so the chart doesn't start
 * years before the platform existed); pass null when there's no data yet.
 */
export function resolveRange(key: RangeKey, now: Date, earliest: Date | null): ResolvedRange {
  const label = RANGE_OPTIONS.find((option) => option.key === key)!.label;

  let from: Date;
  let granularity: Granularity;
  if (key === "all") {
    from = startOfLagosDay(earliest ?? new Date(now.getTime() - 29 * DAY_MS));
    granularity = buildBuckets(from, now, "day").length > MAX_DAILY_BUCKETS ? "month" : "day";
  } else if (key === "12m") {
    from = addLagosMonths(startOfLagosMonth(now), -11);
    granularity = "month";
  } else {
    const days = key === "7d" ? 7 : key === "30d" ? 30 : 90;
    from = new Date(startOfLagosDay(now).getTime() - (days - 1) * DAY_MS);
    granularity = "day";
  }

  // Equal elapsed time on both sides, so a half-finished day or month isn't compared
  // against a whole one.
  const previous = key === "all" ? null : { from: new Date(from.getTime() - (now.getTime() - from.getTime())), to: from };

  return { key, label, from, to: now, previous, granularity, buckets: buildBuckets(from, now, granularity) };
}
