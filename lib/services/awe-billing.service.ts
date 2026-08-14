import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/services/notification.service";
import { getActiveAwePricing } from "@/lib/services/awe-pricing.service";
import { chargeAweSubscriptionPeriod } from "@/lib/services/awe-subscription.service";

const FAILURE_THRESHOLD = 3;

interface BillingResult {
  charged: number;
  failed: number;
}

async function recordFailedCharge(
  subscription: { id: string; userId: string; failedPaymentCount: number },
  errorMessage?: string
): Promise<void> {
  const failedPaymentCount = subscription.failedPaymentCount + 1;
  const escalateToPastDue = failedPaymentCount >= FAILURE_THRESHOLD;

  await prisma.aweSubscription.update({
    where: { id: subscription.id },
    data: {
      failedPaymentCount,
      lastPaymentFailedAt: new Date(),
      ...(escalateToPastDue ? { status: "PAST_DUE" } : {}),
    },
  });

  await createNotification({
    userId: subscription.userId,
    notificationType: "AWE_SUBSCRIPTION_PAYMENT_FAILED",
    message: escalateToPastDue
      ? "Your Awé subscription payment failed and access has been paused. Add funds to your wallet to resume."
      : `Your Awé subscription payment failed${errorMessage ? `: ${errorMessage}` : ""}. We'll retry automatically.`,
    link: "/awe/subscribe",
  });
}

/**
 * Cron entry point: finds every subscription due for renewal and charges it. One
 * subscriber's failure never blocks the rest of the batch (each is caught individually),
 * matching lib/services/webhook-reconciliation.service.ts's pattern. A subscription that
 * fails keeps its nextBillingAt in the past, so the next daily run retries it
 * automatically — no separate backoff/dunning schedule.
 */
export async function processDueAweBilling(): Promise<BillingResult> {
  const pricing = await getActiveAwePricing();
  if (pricing.isFree) return { charged: 0, failed: 0 };

  const dueSubscriptions = await prisma.aweSubscription.findMany({
    where: {
      nextBillingAt: { lte: new Date() },
      cancelAtPeriodEnd: false,
      status: { in: ["ACTIVE", "PAST_DUE"] },
    },
  });

  let charged = 0;
  let failed = 0;

  for (const subscription of dueSubscriptions) {
    try {
      const result = await chargeAweSubscriptionPeriod(subscription.userId, pricing);
      if (result.success) {
        charged += 1;
      } else {
        failed += 1;
        await recordFailedCharge(subscription, result.error);
      }
    } catch (err) {
      failed += 1;
      await recordFailedCharge(subscription, err instanceof Error ? err.message : undefined);
    }
  }

  return { charged, failed };
}
