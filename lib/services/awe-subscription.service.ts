import { prisma } from "@/lib/db";
import { getAccountBalance } from "@/lib/anchor/accounts";
import { bookTransfer, verifyTransfer } from "@/lib/anchor/transfers";
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
 * Charges one billing period against the user's Anchor wallet and rolls their
 * AweSubscription forward. Shared by the first-time subscribe flow and the billing
 * cron's renewal path, so the Anchor-charge mechanics exist exactly once. Mirrors
 * lib/services/chat-payment.service.ts::payForChatAccess's error-handling shape: never
 * throws, always records a Transaction row (SUCCESS or FAILED), returns {success,error}.
 */
export async function chargeAweSubscriptionPeriod(userId: string, pricing: AwePricing): Promise<AweChargeResult> {
  const payer = await prisma.user.findUnique({ where: { id: userId } });
  if (!payer?.depositAccountId) {
    return { success: false, error: "Your wallet isn't set up yet — complete KYC first." };
  }

  const settlementAccountId = process.env.ANCHOR_SETTLEMENT_ACCOUNT_ID;
  if (!settlementAccountId) return { success: false, error: "Payments are not configured yet." };

  const amount = Number(pricing.monthlyPrice);
  const balance = await getAccountBalance(payer.depositAccountId);
  if (balance < amount) {
    return { success: false, error: `Insufficient balance (₦${balance.toLocaleString()}).` };
  }

  const reference = `awesub_${userId.slice(0, 10)}_${Date.now()}`;

  try {
    const { transferId } = await bookTransfer({
      sourceAccountId: payer.depositAccountId,
      destinationAccountId: settlementAccountId,
      amountNaira: amount,
      reason: "Awe subscription via Facilit8",
      reference,
    });

    const status = await verifyTransfer(transferId);
    if (!["successful", "completed"].includes(status)) {
      throw new Error(`Transfer not successful — status: ${status}`);
    }

    const now = new Date();
    const periodEnd = new Date(now.getTime() + pricing.durationDays * 24 * 60 * 60 * 1000);

    const subscription = await prisma.aweSubscription.upsert({
      where: { userId },
      create: {
        userId,
        status: "ACTIVE",
        pricingId: pricing.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingAt: periodEnd,
      },
      update: {
        status: "ACTIVE",
        pricingId: pricing.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        nextBillingAt: periodEnd,
        failedPaymentCount: 0,
        lastPaymentFailedAt: null,
      },
    });

    await prisma.transaction.create({
      data: {
        userId,
        type: "AWE_SUBSCRIPTION",
        status: "SUCCESS",
        amount,
        currency: "NGN",
        reference,
        anchorTransferId: transferId,
        relatedAweSubscriptionId: subscription.id,
        description: "Awe subscription charge",
      },
    });

    await createNotification({
      userId,
      notificationType: "AWE_SUBSCRIPTION_RENEWED",
      message: "Your Awe subscription is active.",
      link: "/awe",
    });

    return { success: true };
  } catch (err) {
    await prisma.transaction.create({
      data: {
        userId,
        type: "AWE_SUBSCRIPTION",
        status: "FAILED",
        amount,
        currency: "NGN",
        reference,
        description: "Awe subscription charge failed",
      },
    });
    return { success: false, error: err instanceof Error ? err.message : "Payment failed." };
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
