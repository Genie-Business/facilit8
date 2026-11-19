import { prisma } from "@/lib/db";
import { processPaystackEvent, type PaystackEvent } from "@/lib/paystack/webhooks";
import { provisionWallet } from "@/lib/services/wallet-provisioning.service";

const MAX_EVENTS_PER_RUN = 50;
const MAX_USERS_PER_RUN = 25;

/**
 * Retries anything Paystack-related that failed transiently: webhook events that never finished
 * processing (we answered 500 and Paystack may or may not have redelivered), and users whose
 * signup-time customer/recipient setup failed. Runs on a schedule so those failures don't sit
 * unresolved until someone notices.
 */
export async function reconcilePaystackWebhooks(): Promise<{ eventsRetried: number; eventsFixed: number }> {
  const pending = await prisma.paystackWebhookEvent.findMany({
    where: { processed: false },
    orderBy: { receivedAt: "asc" },
    take: MAX_EVENTS_PER_RUN,
  });

  let fixed = 0;
  for (const event of pending) {
    try {
      await processPaystackEvent(event.payload as unknown as PaystackEvent);
      await prisma.paystackWebhookEvent.update({ where: { id: event.id }, data: { processed: true, processingError: null } });
      fixed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await prisma.paystackWebhookEvent.update({ where: { id: event.id }, data: { processingError: message } });
    }
  }

  return { eventsRetried: pending.length, eventsFixed: fixed };
}

export async function reconcileFailedProvisioning(): Promise<{ usersRetried: number }> {
  const failedUsers = await prisma.user.findMany({
    where: { vaCreationFailed: true },
    take: MAX_USERS_PER_RUN,
  });

  for (const user of failedUsers) {
    await provisionWallet(user.id);
  }

  return { usersRetried: failedUsers.length };
}
