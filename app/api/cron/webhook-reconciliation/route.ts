import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { reconcileAnchorWebhooks, reconcileFailedProvisioning } from "@/lib/services/webhook-reconciliation.service";
import { reconcileWithdrawals } from "@/lib/services/withdrawal-settlement.service";
import { recordCronRun } from "@/lib/services/cron-run.service";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Webhooks first: replaying a stored nip.transfer.* event settles its withdrawal, so the
  // withdrawal pass after it only has the leftovers to look up with Anchor directly.
  const webhooks = await reconcileAnchorWebhooks();
  const [provisioning, withdrawals] = await Promise.all([reconcileFailedProvisioning(), reconcileWithdrawals()]);

  await recordCronRun("webhook-reconciliation");

  return NextResponse.json({ status: "ok", ...webhooks, ...provisioning, ...withdrawals });
}
