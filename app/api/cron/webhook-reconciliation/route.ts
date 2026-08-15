import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { reconcileAnchorWebhooks, reconcileFailedProvisioning } from "@/lib/services/webhook-reconciliation.service";
import { recordCronRun } from "@/lib/services/cron-run.service";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [webhooks, provisioning] = await Promise.all([
    reconcileAnchorWebhooks(),
    reconcileFailedProvisioning(),
  ]);

  await recordCronRun("webhook-reconciliation");

  return NextResponse.json({ status: "ok", ...webhooks, ...provisioning });
}
