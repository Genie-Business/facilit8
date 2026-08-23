import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { pusherTrigger } from "@/lib/pusher/server";
import { conversationChannel, EVENTS } from "@/lib/pusher/channels";
import { createNotification } from "@/lib/services/notification.service";
import type { Conversation } from "@/lib/generated/prisma/client";

// Mirrors Django's chat/views.py::contains_email_or_phone — blocks contact-info sharing so
// users can't bypass paid chat by trading details directly.
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
// Catches the common "john at gmail dot com" / "john[at]gmail(dot)com" obfuscation used to
// dodge a literal @ / . scan.
const OBFUSCATED_EMAIL_PATTERN =
  /[a-zA-Z0-9._%+-]+\s*[[(]?\s*(?:at|@)\s*[\])]?\s*[a-zA-Z0-9.-]+\s*[[(]?\s*dot\s*[\])]?\s*(?:com|net|org|co|io|ng)\b/i;
// Candidate digit-and-separator runs — validated below by actual digit count, not just
// character count, so a date like "12-05-2026" (8 digits) doesn't collide with a real phone
// number (10+ digits): counting separators toward the length threshold let dates slip through.
const PHONE_CANDIDATE_PATTERN = /\+?[\d\s().-]{9,}/g;

export function containsContactInfo(content: string): boolean {
  if (EMAIL_PATTERN.test(content) || OBFUSCATED_EMAIL_PATTERN.test(content)) return true;

  const candidates = content.match(PHONE_CANDIDATE_PATTERN) ?? [];
  return candidates.some((candidate) => candidate.replace(/\D/g, "").length >= 10);
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
 * (FacilitatorAccess — permanent), the conversation's current access window hasn't expired
 * (accessGranted + accessExpiresAt from the most recent ChatPayment), or the facilitator has
 * been selected to run one of this Event Manager's trainings (standalone or merged) — a
 * confirmed working relationship shouldn't need a separate paywall to coordinate over chat.
 */
export async function hasChatAccess(conversation: Conversation): Promise<boolean> {
  const everPaid = await prisma.facilitatorAccess.findUnique({
    where: {
      userId_facilitatorId: { userId: conversation.eventManagerId, facilitatorId: conversation.facilitatorId },
    },
  });
  if (everPaid) return true;

  const paidWindowOpen =
    conversation.accessGranted && (!conversation.accessExpiresAt || conversation.accessExpiresAt > new Date());
  if (paidWindowOpen) return true;

  return isSelectedFacilitatorFor(conversation.eventManagerId, conversation.facilitatorId);
}

/** True when this facilitator is the selectedTrainer on any of the Event Manager's own
 * standalone or merged training events — free chat access, independent of chat payment. */
async function isSelectedFacilitatorFor(eventManagerId: string, facilitatorId: string): Promise<boolean> {
  const [selectedForEvent, selectedForMerged] = await Promise.all([
    prisma.trainingEvent.findFirst({
      where: { companyId: eventManagerId, selectedTrainerId: facilitatorId },
      select: { id: true },
    }),
    prisma.mergedTrainingEvent.findFirst({
      where: { initiatorId: eventManagerId, selectedTrainerId: facilitatorId },
      select: { id: true },
    }),
  ]);
  return !!selectedForEvent || !!selectedForMerged;
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
