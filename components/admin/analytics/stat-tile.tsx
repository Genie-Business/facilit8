import { describeDelta } from "@/lib/analytics/format";

const ARROWS = {
  up: <path d="M5 1.5 9 8.5H1Z" fill="currentColor" />,
  down: <path d="M5 8.5 9 1.5H1Z" fill="currentColor" />,
  flat: <rect x="1" y="4" width="8" height="2" rx="1" fill="currentColor" />,
};

/**
 * The change against the previous period. The arrow carries the direction and the words carry
 * the amount, so nothing depends on colour alone; the colour only says whether it's good news.
 */
export function Delta({ current, previous, upIsGood = true }: { current: number; previous: number | null; upIsGood?: boolean }) {
  const delta = describeDelta(current, previous, upIsGood);
  if (!delta) return null;
  const arrow = delta.direction === "down" ? ARROWS.down : delta.direction === "flat" ? ARROWS.flat : ARROWS.up;
  return (
    <span className="viz-delta" data-tone={delta.tone}>
      <svg viewBox="0 0 10 10" aria-hidden="true">
        {arrow}
      </svg>
      <span>
        {delta.text}
        {delta.direction !== "flat" && delta.direction !== "new" ? (delta.direction === "up" ? " up" : " down") : ""}
      </span>
    </span>
  );
}

export function StatTile({
  label,
  value,
  current,
  previous,
  upIsGood = true,
  note,
  title,
}: {
  label: string;
  value: string;
  /** Raw numbers for the comparison; omit both for a tile with no previous period (e.g. a "right now" figure). */
  current?: number;
  previous?: number | null;
  upIsGood?: boolean;
  note?: string;
  /** Hover text for a definition that doesn't fit on the tile. */
  title?: string;
}) {
  const comparable = current !== undefined && previous !== undefined && previous !== null;
  return (
    <div className="card viz-tile">
      <div className="viz-tile-label" title={title}>
        {label}
      </div>
      <div className="viz-tile-value">{value}</div>
      <div className="viz-tile-foot">
        {comparable && (
          <>
            <Delta current={current} previous={previous} upIsGood={upIsGood} />
            <span>vs previous period</span>
          </>
        )}
        {note && <span>{note}</span>}
      </div>
    </div>
  );
}
