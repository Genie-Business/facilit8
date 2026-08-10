import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { reconcileAnchorWebhooks, reconcileFailedProvisioning } from "@/lib/services/webhook-reconciliation.service";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [webhooks, provisioning] = await Promise.all([
    reconcileAnchorWebhooks(),
    reconcileFailedProvisioning(),
  ]);

  return NextResponse.json({ status: "ok", ...webhooks, ...provisioning });
}
