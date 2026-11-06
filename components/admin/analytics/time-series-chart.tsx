"use client";

import { useEffect, useId, useRef, useState } from "react";

import {
  formatCount,
  formatCountCompact,
  formatNaira,
  formatNairaCompact,
  niceTicks,
} from "@/lib/analytics/format";

export interface ChartSeries {
  key: string;
  label: string;
  /** Which categorical colour: 1 blue, 2 orange, 3 aqua — assigned per series, never by rank. */
  slot: 1 | 2 | 3;
}

export interface ChartPoint {
  bucket: string;
  label: string;
  values: Record<string, number>;
}

const HEIGHT = 240;
const MARGIN = { top: 12, right: 8, bottom: 28, left: 46 };
const SEGMENT_GAP = 2; // surface-coloured gap between stacked segments
const MAX_BAR = 24;
const END_RADIUS = 4; // data-end rounding; the baseline end stays square
const TOOLTIP_WIDTH = 180;

/** A bar that is rounded at the top and square at the baseline. */
function roundedTopBar(x: number, y: number, w: number, h: number) {
  const r = Math.min(END_RADIUS, w / 2, h);
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

function useMeasuredWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(Math.max(280, Math.floor(element.getBoundingClientRect().width)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * Column chart over time — stacked when there is more than one series. Hover (or the arrow keys)
 * shows every series at that date; "View as table" is the same data without the picture.
 * Drawn at the container's real pixel width so labels stay readable on a phone.
 */
export function TimeSeriesChart({
  title,
  subtitle,
  points,
  series,
  format = "count",
}: {
  title: string;
  subtitle?: string;
  points: ChartPoint[];
  series: ChartSeries[];
  format?: "count" | "naira";
}) {
  const [containerRef, width] = useMeasuredWidth();
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const readoutId = useId();

  const formatFull = format === "naira" ? formatNaira : formatCount;

  const totals = points.map((point) => series.reduce((sum, s) => sum + (point.values[s.key] ?? 0), 0));
  const grandTotal = totals.reduce((sum, value) => sum + value, 0);
  const hasData = grandTotal > 0;

  const header = (
    <div className="viz-card-head">
      <div>
        <h3 className="viz-card-title">{title}</h3>
        {subtitle && <p className="viz-card-sub">{subtitle}</p>}
      </div>
      {hasData && (
        <button type="button" className="viz-link-button" onClick={() => setShowTable((value) => !value)}>
          {showTable ? "View as chart" : "View as table"}
        </button>
      )}
    </div>
  );

  if (!hasData) {
    return (
      <section className="card viz-card">
        {header}
        <p className="viz-empty">Nothing in this period yet.</p>
      </section>
    );
  }

  const { max: axisMax, ticks } = niceTicks(Math.max(...totals), 4, format === "count");
  // One label style per axis: once the top tick is compact (12K), every tick is (5K, not 5,000).
  const compactAxis = axisMax >= 10_000;
  const formatAxis = (value: number) =>
    format === "naira" ? formatNairaCompact(value, compactAxis) : formatCountCompact(value, compactAxis);
  const innerWidth = width - MARGIN.left - MARGIN.right;
  const innerHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const band = innerWidth / points.length;
  const barWidth = Math.max(2, Math.min(MAX_BAR, band * 0.7));
  const xCenter = (index: number) => MARGIN.left + band * (index + 0.5);
  const y = (value: number) => MARGIN.top + innerHeight * (1 - value / axisMax);
  const labelEvery = Math.max(1, Math.ceil(points.length / Math.max(1, Math.floor(innerWidth / 64))));

  const activePoint = active !== null ? points[active] : null;
  const clampedLeft =
    active !== null ? Math.min(Math.max(xCenter(active) - TOOLTIP_WIDTH / 2, 0), Math.max(0, width - TOOLTIP_WIDTH)) : 0;

  function indexFromPointer(clientX: number, element: HTMLElement) {
    const x = clientX - element.getBoundingClientRect().left - MARGIN.left;
    if (x < 0 || x > innerWidth) return null;
    return Math.min(points.length - 1, Math.max(0, Math.floor(x / band)));
  }

  function onKeyDown(event: React.KeyboardEvent) {
    const last = points.length - 1;
    const move = (to: number) => {
      event.preventDefault();
      setActive(Math.min(last, Math.max(0, to)));
    };
    if (event.key === "ArrowRight") move((active ?? -1) + 1);
    else if (event.key === "ArrowLeft") move((active ?? last + 1) - 1);
    else if (event.key === "Home") move(0);
    else if (event.key === "End") move(last);
    else if (event.key === "Escape") setActive(null);
  }

  const readout = activePoint
    ? `${activePoint.label}: ${series.map((s) => `${s.label} ${formatFull(activePoint.values[s.key] ?? 0)}`).join(", ")}`
    : "";

  return (
    <section className="card viz-card">
      {header}

      {series.length > 1 && (
        <div className="viz-legend">
          {series.map((s) => (
            <span key={s.key} className="viz-legend-item">
              <span className="viz-swatch" style={{ background: `var(--series-${s.slot})` }} aria-hidden="true" />
              {s.label}
            </span>
          ))}
        </div>
      )}

      {showTable ? (
        <div className="viz-table-wrap">
          <table className="viz-table">
            <thead>
              <tr>
                <th scope="col">{points[0]?.bucket.length === 7 ? "Month" : "Date"}</th>
                {series.map((s) => (
                  <th key={s.key} scope="col">
                    {s.label}
                  </th>
                ))}
                {series.length > 1 && <th scope="col">Total</th>}
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr key={point.bucket}>
                  <td>{point.label}</td>
                  {series.map((s) => (
                    <td key={s.key}>{formatFull(point.values[s.key] ?? 0)}</td>
                  ))}
                  {series.length > 1 && <td>{formatFull(totals[index])}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="viz-chart"
          tabIndex={0}
          aria-describedby={readoutId}
          onKeyDown={onKeyDown}
          onFocus={() => setActive((current) => current ?? points.length - 1)}
          onBlur={() => setActive(null)}
          onPointerMove={(event) => setActive(indexFromPointer(event.clientX, event.currentTarget))}
          onPointerLeave={() => setActive(null)}
        >
          <svg
            width={width}
            height={HEIGHT}
            viewBox={`0 0 ${width} ${HEIGHT}`}
            role="img"
            aria-label={`${title}: ${formatFull(grandTotal)} in total across ${points.length} ${points.length === 1 ? "period" : "periods"}. Use the arrow keys to read each one.`}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line
                  className={tick === 0 ? "viz-baseline" : "viz-gridline"}
                  x1={MARGIN.left}
                  x2={width - MARGIN.right}
                  y1={y(tick)}
                  y2={y(tick)}
                />
                <text className="viz-axis-text" x={MARGIN.left - 8} y={y(tick) + 4} textAnchor="end">
                  {formatAxis(tick)}
                </text>
              </g>
            ))}

            {active !== null && (
              <rect className="viz-hover-wash" x={MARGIN.left + band * active} y={MARGIN.top} width={band} height={innerHeight} rx={4} />
            )}

            {points.map((point, index) => {
              let stackedTo = 0;
              let drawn = 0;
              const topKey = [...series].reverse().find((s) => (point.values[s.key] ?? 0) > 0)?.key;
              return (
                <g key={point.bucket}>
                  {series.map((s) => {
                    const value = point.values[s.key] ?? 0;
                    if (value <= 0) return null;
                    const bottomY = y(stackedTo);
                    const topY = y(stackedTo + value);
                    stackedTo += value;
                    const isFirst = drawn === 0;
                    drawn++;
                    // Every segment above the first gives up SEGMENT_GAP at its base, leaving a
                    // surface-coloured seam rather than a stroke around the mark.
                    const segmentBottom = isFirst ? bottomY : bottomY - SEGMENT_GAP;
                    const height = Math.max(1, segmentBottom - topY);
                    const x = xCenter(index) - barWidth / 2;
                    return s.key === topKey ? (
                      <path key={s.key} className={`viz-s${s.slot}`} d={roundedTopBar(x, segmentBottom - height, barWidth, height)} />
                    ) : (
                      <rect key={s.key} className={`viz-s${s.slot}`} x={x} y={segmentBottom - height} width={barWidth} height={height} />
                    );
                  })}
                </g>
              );
            })}

            {points.map((point, index) =>
              index % labelEvery === 0 ? (
                <text key={point.bucket} className="viz-axis-text" x={xCenter(index)} y={HEIGHT - 8} textAnchor="middle">
                  {point.label}
                </text>
              ) : null
            )}
          </svg>

          {activePoint && (
            <div className="viz-tooltip" style={{ left: clampedLeft, width: TOOLTIP_WIDTH }} aria-hidden="true">
              <div className="viz-tooltip-head">{activePoint.label}</div>
              {[...series].reverse().map((s) => (
                <div key={s.key} className="viz-tooltip-row">
                  <i className="viz-tooltip-key" style={{ background: `var(--series-${s.slot})` }} />
                  <strong>{formatFull(activePoint.values[s.key] ?? 0)}</strong>
                  <span>{s.label}</span>
                </div>
              ))}
              {series.length > 1 && (
                <div className="viz-tooltip-row viz-tooltip-total">
                  <strong>{formatFull(totals[active!])}</strong>
                  <span>Total</span>
                </div>
              )}
            </div>
          )}

          <span id={readoutId} aria-live="polite" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
            {readout}
          </span>
        </div>
      )}
    </section>
  );
}
