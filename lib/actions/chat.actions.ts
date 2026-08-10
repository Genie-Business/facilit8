"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getOrCreateConversation, hasChatAccess, sendMessage } from "@/lib/services/chat.service";
import { payForChatAccess } from "@/lib/services/chat-payment.service";
import { messageFormSchema } from "@/lib/validation/chat";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";

export async function startConversationAction(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session || session.user.role !== "EVENT_MANAGER") redirect("/facilitators");

  const facilitatorSlug = formData.get("facilitatorSlug");
  if (typeof facilitatorSlug !== "string" || !facilitatorSlug) redirect("/facilitators");

  const facilitator = await prisma.user.findUnique({ where: { slug: facilitatorSlug, role: "FACILITATOR" } });
  if (!facilitator) redirect("/facilitators");

  const conversation = await getOrCreateConversation(session.user.id, facilitator.id);
  const access = await hasChatAccess(conversation);

  redirect(access ? `/chat/${conversation.slug}` : `/chat/${conversation.slug}/pay`);
}

export async function sendMessageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const slug = formData.get("conversationSlug");
  if (typeof slug !== "string" || !slug) return { error: "Missing conversation." };

  const parsed = messageFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };

  const conversation = await prisma.conversation.findUnique({ where: { slug } });
  if (!conversation) return { error: "Conversation not found." };
  if (conversation.eventManagerId !== session.user.id && conversation.facilitatorId !== session.user.id) {
    return { error: "You don't have access to this conversation." };
  }

  const access = await hasChatAccess(conversation);
  if (!access) return { error: "This conversation isn't unlocked yet." };

  const result = await sendMessage(conversation, session.user.id, parsed.data.content);
  if (!result.success) return { error: result.error };

  revalidatePath(`/chat/${slug}`);
  return {};
}

export async function payForChatAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const slug = formData.get("conversationSlug");
  if (typeof slug !== "string" || !slug) return { error: "Missing conversation." };

  const conversation = await prisma.conversation.findUnique({ where: { slug } });
  if (!conversation) return { error: "Conversation not found." };

  const result = await payForChatAccess(conversation, session.user.id);
  if (!result.success) return { error: result.error };

  revalidatePath(`/chat/${slug}`);
  redirect(`/chat/${slug}`);
}
