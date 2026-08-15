import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { sendEventReminders } from "@/lib/services/event-reminder.service";
import { processDueAweBilling } from "@/lib/services/awe-billing.service";
import { recordCronRun } from "@/lib/services/cron-run.service";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventReminders = await sendEventReminders();
  const aweBilling = await processDueAweBilling();
  await recordCronRun("daily");
  return NextResponse.json({ status: "ok", eventReminders, aweBilling });
}
