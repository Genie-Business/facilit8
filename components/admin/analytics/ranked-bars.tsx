import { formatCount, formatNaira, formatShare } from "@/lib/analytics/format";

interface BarItem {
  label: string;
  value: number;
}

function formatterFor(format: "count" | "naira") {
  return format === "naira" ? formatNaira : formatCount;
}

/**
 * Ranked horizontal bars: one hue, largest first, value at the tip. For comparing the parts of
 * a whole or the top few of a long list — bars on a shared baseline compare more exactly than
 * slices. The list itself is the table view: every value is printed.
 */
export function RankedBars({
  title,
  subtitle,
  items,
  format = "count",
  showShare = false,
  empty = "Nothing in this period yet.",
}: {
  title: string;
  subtitle?: string;
  items: BarItem[];
  format?: "count" | "naira";
  /** Print each row's share of the total next to its value. */
  showShare?: boolean;
  empty?: string;
}) {
  const fmt = formatterFor(format);
  const visible = items.filter((item) => item.value > 0);
  const max = Math.max(0, ...visible.map((item) => item.value));
  const total = visible.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="card viz-card">
      <div className="viz-card-head">
        <div>
          <h3 className="viz-card-title">{title}</h3>
          {subtitle && <p className="viz-card-sub">{subtitle}</p>}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="viz-empty">{empty}</p>
      ) : (
        <ol className="viz-rank">
          {visible.map((item) => (
            <li key={item.label} className="viz-rank-row">
              <span className="viz-rank-label" title={item.label}>
                {item.label}
              </span>
              <span className="viz-rank-value">
                {fmt(item.value)}
                {showShare && <small>{formatShare(item.value, total)}</small>}
              </span>
              <div className="viz-rank-track" aria-hidden="true">
                <div className="viz-rank-bar" style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

/**
 * How far a group got through an ordered set of stages. Every bar is scaled to the first stage
 * and carries both numbers a reader wants: how much of the start survived, and how much of the
 * previous stage did. One series, so one colour — the stage names do the distinguishing.
 */
export function FunnelBars({
  title,
  subtitle,
  stages,
  empty = "Nothing in this period yet.",
}: {
  title: string;
  subtitle?: string;
  stages: BarItem[];
  empty?: string;
}) {
  const first = stages[0]?.value ?? 0;

  return (
    <section className="card viz-card">
      <div className="viz-card-head">
        <div>
          <h3 className="viz-card-title">{title}</h3>
          {subtitle && <p className="viz-card-sub">{subtitle}</p>}
        </div>
      </div>
      {first === 0 ? (
        <p className="viz-empty">{empty}</p>
      ) : (
        <ol className="viz-rank">
          {stages.map((stage, index) => (
            <li key={stage.label} className="viz-rank-row">
              <span className="viz-rank-label">{stage.label}</span>
              <span className="viz-rank-value">
                {formatCount(stage.value)}
                <small>{formatShare(stage.value, first)}</small>
              </span>
              <div className="viz-rank-track" aria-hidden="true">
                <div className="viz-rank-bar" style={{ width: `${(stage.value / first) * 100}%` }} />
              </div>
              {index > 0 && stages[index - 1].value > 0 && (
                <span className="viz-rank-note">{formatShare(stage.value, stages[index - 1].value)} of the stage before</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
