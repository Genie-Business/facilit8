import { NextResponse } from "next/server";

import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { sendEventReminders } from "@/lib/services/event-reminder.service";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendEventReminders();
  return NextResponse.json({ status: "ok", ...result });
}
