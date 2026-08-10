import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { verifyAnchorSignature, processAnchorWebhook } from "@/lib/anchor/webhooks";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-anchor-signature");

  if (!verifyAnchorSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dataBlock = (payload.data ?? {}) as { type?: string; id?: string };
  const eventType = dataBlock.type ?? (payload.event as string | undefined) ?? "unknown";
  const eventId = dataBlock.id ?? (payload.id as string | undefined) ?? randomUUID();

  let eventRecord;
  try {
    eventRecord = await prisma.anchorWebhookEvent.create({
      data: { eventId, eventType, payload: payload as never },
    });
  } catch {
    // Unique constraint violation on eventId → already processed.
    return NextResponse.json({ status: "duplicate" }, { status: 200 });
  }

  try {
    const status = await processAnchorWebhook(payload, eventType);
    await prisma.anchorWebhookEvent.update({ where: { id: eventRecord.id }, data: { processed: true } });
    return NextResponse.json({ status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.anchorWebhookEvent.update({
      where: { id: eventRecord.id },
      data: { processingError: message },
    });
    console.error("Anchor webhook processing error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
