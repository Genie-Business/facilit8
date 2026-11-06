import { auth } from "@/lib/auth";
import { parseRange, resolveRange } from "@/lib/analytics/range";
import {
  buildExportCsv,
  ExportTooLargeError,
  isExportDataset,
} from "@/lib/services/admin-export.service";

export const dynamic = "force-dynamic";

// Super Admin only: the export contains every user's email and name in bulk, which a Support
// Admin has no need to take off the platform. Checked here as well as hiding the buttons —
// a hidden link is not access control.
export async function GET(request: Request) {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN" || session.user.adminTier !== "SUPER_ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const dataset = params.get("dataset");
  if (!isExportDataset(dataset)) return new Response("Unknown dataset.", { status: 400 });

  const rangeKey = parseRange(params.get("range") ?? undefined);
  const now = new Date();
  const window = { from: rangeKey === "all" ? null : resolveRange(rangeKey, now, null).from, to: now };

  try {
    const { csv, rows } = await buildExportCsv(dataset, window);
    // No audit-log table exists; this line in the runtime logs is the record of who took what.
    console.info(`[admin-export] ${session.user.id} exported ${dataset} (${rangeKey}): ${rows} rows`);

    // BOM so Excel reads the UTF-8 (names like Ọlá) instead of mangling it.
    return new Response(`﻿${csv}`, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="facilit8-${dataset}-${rangeKey}-${now.toISOString().slice(0, 10)}.csv"`,
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ExportTooLargeError) return new Response(error.message, { status: 413 });
    throw error;
  }
}
