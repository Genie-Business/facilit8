import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { isFacilit8Event } from "@/lib/paystack/event-ownership";
import { processPaystackEvent, type PaystackEvent } from "@/lib/paystack/webhooks";
import { paystackEventKey, verifyPaystackSignature } from "@/lib/paystack/webhook-signature";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // The raw text, untouched: the signature is over these exact bytes.
  const rawBody = await request.text();
  if (!verifyPaystackSignature(rawBody, request.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PaystackEvent;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!payload?.event || typeof payload.event !== "string") {
    return NextResponse.json({ error: "Not a Paystack event" }, { status: 400 });
  }

  // The signature is genuine, but the event may belong to another product sharing this Paystack
  // account. Answer 200 so Paystack doesn't retry it, and keep nothing.
  if (!isFacilit8Event(payload)) return NextResponse.json({ status: "not_ours" });

  const eventKey = paystackEventKey(payload, rawBody);

  // Every event is stored before it is acted on: an audit trail, and the retry queue for anything
  // that fails halfway. A redelivery finds its row — if it was already handled we're done; if not
  // (the first attempt threw) we handle it now.
  let record = await prisma.paystackWebhookEvent.findUnique({ where: { eventKey } });
  if (record?.processed) return NextResponse.json({ status: "duplicate" });
  if (!record) {
    try {
      record = await prisma.paystackWebhookEvent.create({
        data: { eventKey, eventType: payload.event, payload: payload as never },
      });
    } catch {
      // Two deliveries racing: the other one is handling it.
      return NextResponse.json({ status: "duplicate" });
    }
  }

  try {
    const status = await processPaystackEvent(payload);
    await prisma.paystackWebhookEvent.update({ where: { id: record.id }, data: { processed: true, processingError: null } });
    return NextResponse.json({ status });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await prisma.paystackWebhookEvent.update({ where: { id: record.id }, data: { processingError: message } });
    console.error(`Paystack webhook ${payload.event} failed:`, err);
    // A non-2xx makes Paystack redeliver with backoff; the reconciliation cron also retries it.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
