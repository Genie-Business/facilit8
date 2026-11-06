import { prisma } from "@/lib/db";
import { getActiveChatPricing } from "@/lib/services/chat-payment.service";

/**
 * Sets the flat naira fee an Event Manager pays to unlock a chat. Deactivate-then-create,
 * matching the ChatPricing/PlatformFee/AwePricing "latest active row wins" convention, so every
 * past price stays on file. The access window carries over from the current row — only the
 * amount is changed here — and conversations already paid for keep the expiry they were sold with.
 */
export async function setChatFee(amount: number): Promise<void> {
  const current = await getActiveChatPricing();
  await prisma.$transaction([
    prisma.chatPricing.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.chatPricing.create({ data: { amount, durationDays: current.durationDays, isActive: true } }),
  ]);
}
