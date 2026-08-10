import { prisma } from "@/lib/db";
import { processAnchorWebhook } from "@/lib/anchor/webhooks";
import { provisionAnchorCustomer } from "@/lib/services/anchor-provisioning.service";

const MAX_EVENTS_PER_RUN = 50;
const MAX_USERS_PER_RUN = 25;

/**
 * Retries anything Anchor-related that failed transiently: webhook events that never
 * finished processing, and users whose signup-time customer/counterparty provisioning
 * failed (network blip, Anchor downtime, etc). Runs on a schedule so those failures don't
 * sit unresolved until someone notices.
 */
export async function reconcileAnchorWebhooks(): Promise<{ eventsRetried: number; eventsFixed: number }> {
  const pending = await prisma.anchorWebhookEvent.findMany({
    where: { processed: false },
    orderBy: { receivedAt: "asc" },
    take: MAX_EVENTS_PER_RUN,
  });

  let fixed = 0;
  for (const event of pending) {
    try {
      await processAnchorWebhook(event.payload as never, event.eventType);
      await prisma.anchorWebhookEvent.update({
        where: { id: event.id },
        data: { processed: true, processingError: null },
      });
      fixed += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      await prisma.anchorWebhookEvent.update({ where: { id: event.id }, data: { processingError: message } });
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
    await provisionAnchorCustomer(user.id);
  }

  return { usersRetried: failedUsers.length };
}
