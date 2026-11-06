// Display formatting for the analytics page. Pure, so it can be tested without rendering.

const NGN = "₦"; // ₦

export function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-NG");
}

/** ₦1,234,567 — whole naira; analytics never needs kobo. */
export function formatNaira(value: number): string {
  return `${NGN}${Math.round(value).toLocaleString("en-NG")}`;
}

/** 12.4 -> "12.4", 12 -> "12", 124.6 -> "125": one decimal while it still matters. */
function trimmed(n: number): string {
  return (Math.abs(n) >= 100 || Number.isInteger(n) ? Math.round(n) : Math.round(n * 10) / 10).toLocaleString("en-NG");
}

function scale(value: number): { n: number; suffix: string } {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return { n: value / 1_000_000_000, suffix: "B" };
  if (abs >= 1_000_000) return { n: value / 1_000_000, suffix: "M" };
  return { n: value / 1_000, suffix: "K" };
}

/**
 * Full under ₦10,000 (₦5,000), compact from there (₦12K, ₦1.2M, ₦3.4B). A chart axis must use
 * ONE style for all its ticks, so it passes `forceCompact` once its top tick is compact —
 * otherwise ₦5,000 would sit above ₦10K.
 */
export function formatNairaCompact(value: number, forceCompact = false): string {
  const abs = Math.abs(value);
  if (abs < 1_000 || (abs < 10_000 && !forceCompact)) return formatNaira(value);
  const { n, suffix } = scale(value);
  return `${NGN}${trimmed(n)}${suffix}`;
}

/** Same rule for plain counts (people, events): full under 10,000, compact above. */
export function formatCountCompact(value: number, forceCompact = false): string {
  const abs = Math.abs(value);
  if (abs < 1_000 || (abs < 10_000 && !forceCompact)) return formatCount(value);
  const { n, suffix } = scale(value);
  return `${trimmed(n)}${suffix}`;
}

/** "42%" of a whole; "0%" rather than NaN when there's nothing to take a share of. */
export function formatShare(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  const pct = (part / whole) * 100;
  return `${pct >= 10 || Number.isInteger(pct) ? Math.round(pct) : Math.round(pct * 10) / 10}%`;
}

export type DeltaTone = "good" | "bad" | "neutral";
export interface Delta {
  direction: "up" | "down" | "flat" | "new";
  /** "12%", "New", or "No change". */
  text: string;
  tone: DeltaTone;
}

/**
 * How this period compares with the one before. `upIsGood` is whether growth is a good thing
 * (it isn't for disputes). Returns null when there is nothing to compare against ("all time").
 * A rise from zero has no meaningful percentage, so it's labelled "New" rather than ∞.
 */
export function describeDelta(current: number, previous: number | null, upIsGood = true): Delta | null {
  if (previous === null) return null;
  if (current === previous) return { direction: "flat", text: "No change", tone: "neutral" };
  if (previous === 0) return { direction: "new", text: "New", tone: upIsGood ? "good" : "bad" };

  const pct = ((current - previous) / previous) * 100;
  const magnitude = Math.abs(pct);
  const rounded = magnitude >= 10 ? Math.round(magnitude) : Math.round(magnitude * 10) / 10;
  const up = pct > 0;
  return { direction: up ? "up" : "down", text: `${rounded}%`, tone: up === upIsGood ? "good" : "bad" };
}

/**
 * Round axis ceiling and tick values for a 0-based axis: 0, 25, 50, 75, 100 — never 0, 37, 74.
 * `integer` is for counts, where a half-person tick (0, 0.5, 1) would be nonsense.
 */
export function niceTicks(max: number, targetTicks = 4, integer = false): { max: number; ticks: number[] } {
  if (!(max > 0)) return { max: 1, ticks: [0, 1] };
  const rough = max / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const multipliers = integer ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  let step = multipliers.map((m) => m * magnitude).find((candidate) => candidate >= rough) ?? 10 * magnitude;
  if (integer) step = Math.max(1, Math.ceil(step));
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 1000; value += step) ticks.push(Math.round(value * 1e6) / 1e6);
  return { max: top, ticks };
}
