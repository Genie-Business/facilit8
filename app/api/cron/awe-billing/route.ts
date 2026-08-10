import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { processDueAweBilling } from "@/lib/services/awe-billing.service";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processDueAweBilling();
  return NextResponse.json({ status: "ok", ...result });
}
