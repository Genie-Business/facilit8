import { prisma } from "@/lib/db";
import { AlreadyDoneError, describeLedgerError } from "@/lib/ledger/errors";
import { inLedgerTransaction, postJournal } from "@/lib/ledger/ledger.service";
import { chargeLegs } from "@/lib/ledger/journals";
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

/**
 * The Event Manager pays Facilit8 directly to unlock a conversation: wallet -> revenue, in one
 * transaction with the access being granted. The first payment for a pairing grants access for good
 * (hasChatAccess treats FacilitatorAccess as permanent), so a second payment attempt — a double
 * click — is refused rather than charged.
 */
export async function payForChatAccess(conversation: Conversation, payerId: string): Promise<ChatPaymentResult> {
  if (conversation.eventManagerId !== payerId) {
    return { success: false, error: "Only the Event Manager can unlock this conversation." };
  }

  const payer = await prisma.user.findUnique({ where: { id: payerId } });
  if (!payer?.depositAccountId) {
    return { success: false, error: "Your wallet isn't set up yet. Complete KYC first." };
  }

  const pricing = await getActiveChatPricing();
  const amount = Number(pricing.amount);
  const reference = `chatpay_${conversation.id}`;
  const expiresAt = new Date(Date.now() + pricing.durationDays * 24 * 60 * 60 * 1000);

  try {
    await inLedgerTransaction(async (tx) => {
      const alreadyUnlocked = await tx.facilitatorAccess.findUnique({
        where: { userId_facilitatorId: { userId: conversation.eventManagerId, facilitatorId: conversation.facilitatorId } },
      });
      if (alreadyUnlocked) throw new AlreadyDoneError("This conversation is already unlocked.");

      const journal = await postJournal(
        { reference, type: "CHAT_PAYMENT", description: "Chat access unlock", legs: chargeLegs(payerId, amount) },
        tx
      );
      // The journal reference is per conversation, so a concurrent click that got past the check
      // above finds it already posted: that's "already unlocked", not a second charge.
      if (!journal.created) throw new AlreadyDoneError("This conversation is already unlocked.");
      await tx.transaction.create({
        data: {
          userId: payerId,
          type: "CHAT_PAYMENT",
          status: "SUCCESS",
          amount,
          currency: "NGN",
          reference,
          relatedConversationId: conversation.id,
          description: "Chat access unlock",
        },
      });
      await tx.conversation.update({
        where: { id: conversation.id },
        data: { paymentConfirmed: true, accessGranted: true, accessExpiresAt: expiresAt },
      });
      await tx.chatPayment.upsert({
        where: { conversationId: conversation.id },
        create: { conversationId: conversation.id, pricingId: pricing.id, expiresAt, paidAt: new Date() },
        update: { pricingId: pricing.id, expiresAt, paidAt: new Date() },
      });
      await tx.facilitatorAccess.create({
        data: { userId: conversation.eventManagerId, facilitatorId: conversation.facilitatorId },
      });
    });
  } catch (err) {
    return { success: false, error: describeLedgerError(err, "Payment failed. Please try again.") };
  }

  await createNotification({
    userId: conversation.facilitatorId,
    notificationType: "CHAT_MESSAGE",
    message: "An Event Manager unlocked a chat with you.",
    link: `/chat/${conversation.slug}`,
  });

  return { success: true };
}
