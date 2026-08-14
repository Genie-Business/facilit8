import { prisma } from "@/lib/db";
import { getAccountBalance } from "@/lib/anchor/accounts";
import { bookTransfer, verifyTransfer } from "@/lib/anchor/transfers";
import { createNotification } from "@/lib/services/notification.service";
import type { Conversation } from "@/lib/generated/prisma/client";

interface ChatPaymentResult {
  success: boolean;
  error?: string;
}

/** Returns the single active ChatPricing row, creating a sensible default if none exists yet. */
export async function getActiveChatPricing() {
  const existing = await prisma.chatPricing.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
  if (existing) return existing;

  // Placeholder default until the Phase 6 admin CMS lets this be configured directly.
  return prisma.chatPricing.create({ data: { amount: 5000, durationDays: 30, isActive: true } });
}

export async function payForChatAccess(conversation: Conversation, payerId: string): Promise<ChatPaymentResult> {
  if (conversation.eventManagerId !== payerId) {
    return { success: false, error: "Only the Event Manager can unlock this conversation." };
  }

  const payer = await prisma.user.findUnique({ where: { id: payerId } });
  if (!payer?.depositAccountId) {
    return { success: false, error: "Your wallet isn't set up yet. Complete KYC first." };
  }

  const settlementAccountId = process.env.ANCHOR_SETTLEMENT_ACCOUNT_ID;
  if (!settlementAccountId) return { success: false, error: "Payments are not configured yet." };

  const pricing = await getActiveChatPricing();
  const amount = Number(pricing.amount);

  const balance = await getAccountBalance(payer.depositAccountId);
  if (balance < amount) {
    return { success: false, error: `Insufficient balance (₦${balance.toLocaleString()}).` };
  }

  const reference = `chatpay_${conversation.id.slice(0, 16)}`;

  try {
    const { transferId } = await bookTransfer({
      sourceAccountId: payer.depositAccountId,
      destinationAccountId: settlementAccountId,
      amountNaira: amount,
      reason: "Chat access via Facilit8",
      reference,
    });

    const status = await verifyTransfer(transferId);
    if (!["successful", "completed"].includes(status)) {
      throw new Error(`Transfer not successful, status: ${status}`);
    }

    const expiresAt = new Date(Date.now() + pricing.durationDays * 24 * 60 * 60 * 1000);

    await prisma.$transaction([
      prisma.transaction.create({
        data: {
          userId: payerId,
          type: "CHAT_PAYMENT",
          status: "SUCCESS",
          amount,
          currency: "NGN",
          reference,
          anchorTransferId: transferId,
          relatedConversationId: conversation.id,
          description: "Chat access unlock",
        },
      }),
      prisma.conversation.update({
        where: { id: conversation.id },
        data: { paymentConfirmed: true, accessGranted: true, accessExpiresAt: expiresAt },
      }),
      prisma.chatPayment.upsert({
        where: { conversationId: conversation.id },
        create: { conversationId: conversation.id, pricingId: pricing.id, expiresAt, paidAt: new Date() },
        update: { pricingId: pricing.id, expiresAt, paidAt: new Date() },
      }),
      prisma.facilitatorAccess.upsert({
        where: {
          userId_facilitatorId: {
            userId: conversation.eventManagerId,
            facilitatorId: conversation.facilitatorId,
          },
        },
        create: { userId: conversation.eventManagerId, facilitatorId: conversation.facilitatorId },
        update: {},
      }),
    ]);

    await createNotification({
      userId: conversation.facilitatorId,
      notificationType: "CHAT_MESSAGE",
      message: "An Event Manager unlocked a chat with you.",
      link: `/chat/${conversation.slug}`,
    });

    return { success: true };
  } catch (err) {
    await prisma.transaction.create({
      data: {
        userId: payerId,
        type: "CHAT_PAYMENT",
        status: "FAILED",
        amount,
        currency: "NGN",
        reference,
        relatedConversationId: conversation.id,
        description: "Chat access unlock failed",
      },
    });
    return { success: false, error: err instanceof Error ? err.message : "Payment failed." };
  }
}
