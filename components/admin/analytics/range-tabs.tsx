import Link from "next/link";

import { RANGE_OPTIONS, type RangeKey } from "@/lib/analytics/range";

/** The one filter on the page — it scopes every number and chart below it. */
export function RangeTabs({ active }: { active: RangeKey }) {
  return (
    <nav className="viz-tabs" aria-label="Date range">
      {RANGE_OPTIONS.map((option) => (
        <Link
          key={option.key}
          href={`/admin/analytics?range=${option.key}`}
          className="viz-tab"
          aria-current={option.key === active ? "page" : undefined}
          prefetch={false}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}
