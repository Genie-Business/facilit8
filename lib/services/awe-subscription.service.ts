import { prisma } from "@/lib/db";
import { AlreadyDoneError, describeLedgerError } from "@/lib/ledger/errors";
import { inLedgerTransaction, postJournal } from "@/lib/ledger/ledger.service";
import { chargeLegs } from "@/lib/ledger/journals";
import { createNotification } from "@/lib/services/notification.service";
import { getActiveAwePricing } from "@/lib/services/awe-pricing.service";
import type { AwePricing } from "@/lib/generated/prisma/client";

interface AweChargeResult {
  success: boolean;
  error?: string;
}

export async function hasAweAccess(userId: string): Promise<boolean> {
  const pricing = await getActiveAwePricing();
  if (pricing.isFree) return true;

  const subscription = await prisma.aweSubscription.findUnique({ where: { userId } });
  return !!subscription && subscription.status === "ACTIVE" && subscription.currentPeriodEnd > new Date();
}

/**
 * Charges one billing period against the user's wallet and rolls their AweSubscription forward.
 * Shared by the first-time subscribe flow and the billing cron's renewal path, so the charging
 * mechanics exist exactly once. Never throws; returns {success, error}.
 *
 * The charge, the subscription update and the Transaction row commit together. And because two
 * overlapping billing runs (or a double click) could otherwise both charge the same period, the
 * subscription is re-read INSIDE the transaction: one that is already ACTIVE with time left has
 * been paid for, so the second attempt is refused and nothing is charged.
 */
export async function chargeAweSubscriptionPeriod(userId: string, pricing: AwePricing): Promise<AweChargeResult> {
  const payer = await prisma.user.findUnique({ where: { id: userId } });
  if (!payer?.depositAccountId) {
    return { success: false, error: "Your wallet isn't set up yet. Complete KYC first." };
  }

  const amount = Number(pricing.monthlyPrice);
  const reference = `awesub_${userId}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

  try {
    await inLedgerTransaction(async (tx) => {
      const now = new Date();
      const periodEnd = new Date(now.getTime() + pricing.durationDays * 24 * 60 * 60 * 1000);
      const period = {
        status: "ACTIVE" as const,
        pricingId: pricing.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingAt: periodEnd,
        failedPaymentCount: 0,
        lastPaymentFailedAt: null,
      };

      // CLAIM the period before any money moves. The conditional update is the lock: of several
      // overlapping attempts only one can match "not active, or the period has run out" — the rest
      // wait for it, re-check against the committed row and find it paid. (Checking first and
      // charging after would let every attempt read the same stale row and all charge.)
      const existing = await tx.aweSubscription.findUnique({ where: { userId } });
      let subscriptionId: string;
      if (existing) {
        const claimed = await tx.aweSubscription.updateMany({
          where: { id: existing.id, OR: [{ status: { not: "ACTIVE" } }, { currentPeriodEnd: { lte: now } }] },
          data: period,
        });
        if (claimed.count !== 1) throw new AlreadyDoneError("Your Awé subscription is already active.");
        subscriptionId = existing.id;
      } else {
        try {
          subscriptionId = (await tx.aweSubscription.create({ data: { userId, ...period }, select: { id: true } })).id;
        } catch (err) {
          // Two first-time subscribe clicks: the unique userId index lets exactly one create it.
          if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") {
            throw new AlreadyDoneError("Your Awé subscription is already active.");
          }
          throw err;
        }
      }

      await postJournal(
        { reference, type: "AWE_SUBSCRIPTION", description: "Awé subscription charge", legs: chargeLegs(userId, amount) },
        tx
      );
      await tx.transaction.create({
        data: {
          userId,
          type: "AWE_SUBSCRIPTION",
          status: "SUCCESS",
          amount,
          currency: "NGN",
          reference,
          relatedAweSubscriptionId: subscriptionId,
          description: "Awe subscription charge",
        },
      });
    });

    await createNotification({
      userId,
      notificationType: "AWE_SUBSCRIPTION_RENEWED",
      message: "Your Awé subscription is active.",
      link: "/awe",
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: describeLedgerError(err, "Payment failed. Please try again.") };
  }
}

/** First charge — the paywall "Subscribe" click. No-op if Awe is currently free. */
export async function subscribeToAwe(userId: string): Promise<AweChargeResult> {
  const pricing = await getActiveAwePricing();
  if (pricing.isFree) return { success: true };
  return chargeAweSubscriptionPeriod(userId, pricing);
}

/**
 * Access continues until the current period ends — the billing cron just stops
 * renewing it. No immediate revocation, no refund logic.
 */
export async function cancelAweSubscription(userId: string): Promise<void> {
  await prisma.aweSubscription.updateMany({
    where: { userId },
    data: { cancelAtPeriodEnd: true, canceledAt: new Date() },
  });
}

/** Undoes a pending cancellation — only meaningful while the current period hasn't ended yet. */
export async function undoAweSubscriptionCancellation(userId: string): Promise<void> {
  await prisma.aweSubscription.updateMany({
    where: { userId, cancelAtPeriodEnd: true },
    data: { cancelAtPeriodEnd: false, canceledAt: null },
  });
}
