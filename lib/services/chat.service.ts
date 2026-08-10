import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { pusherTrigger } from "@/lib/pusher/server";
import { conversationChannel, EVENTS } from "@/lib/pusher/channels";
import { createNotification } from "@/lib/services/notification.service";
import type { Conversation } from "@/lib/generated/prisma/client";

// Mirrors Django's chat/views.py::contains_email_or_phone — blocks contact-info sharing so
// users can't bypass paid chat by trading details directly.
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_PATTERN = /(\+?\d[\d\s().-]{7,}\d)/;

export function containsContactInfo(content: string): boolean {
  return EMAIL_PATTERN.test(content) || PHONE_PATTERN.test(content);
}

export async function getOrCreateConversation(eventManagerId: string, facilitatorId: string): Promise<Conversation> {
  const existing = await prisma.conversation.findUnique({
    where: { eventManagerId_facilitatorId: { eventManagerId, facilitatorId } },
  });
  if (existing) return existing;

  const slug = await generateUniqueSlug(
    `${eventManagerId}-${facilitatorId}`.slice(0, 20),
    async (candidate) => (await prisma.conversation.findUnique({ where: { slug: candidate } })) !== null
  );

  return prisma.conversation.create({ data: { eventManagerId, facilitatorId, slug } });
}

/**
 * A user "has access" to a conversation if they've ever paid for this pairing before
 * (FacilitatorAccess — permanent) or the conversation's current access window hasn't
 * expired (accessGranted + accessExpiresAt from the most recent ChatPayment).
 */
export async function hasChatAccess(conversation: Conversation): Promise<boolean> {
  const everPaid = await prisma.facilitatorAccess.findUnique({
    where: {
      userId_facilitatorId: { userId: conversation.eventManagerId, facilitatorId: conversation.facilitatorId },
    },
  });
  if (everPaid) return true;

  return conversation.accessGranted && (!conversation.accessExpiresAt || conversation.accessExpiresAt > new Date());
}

interface SendMessageResult {
  success: boolean;
  error?: string;
}

export async function sendMessage(
  conversation: Conversation,
  senderId: string,
  content: string
): Promise<SendMessageResult> {
  if (containsContactInfo(content)) {
    return { success: false, error: "Messages can't contain email addresses or phone numbers." };
  }

  const message = await prisma.message.create({
    data: { conversationId: conversation.id, senderId, content },
  });

  await pusherTrigger(conversationChannel(conversation.id), EVENTS.MESSAGE_NEW, {
    id: message.id,
    senderId: message.senderId,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  });

  const recipientId = senderId === conversation.eventManagerId ? conversation.facilitatorId : conversation.eventManagerId;
  await createNotification({
    userId: recipientId,
    notificationType: "CHAT_MESSAGE",
    message: "You have a new message.",
    link: `/chat/${conversation.slug}`,
  });

  return { success: true };
}
