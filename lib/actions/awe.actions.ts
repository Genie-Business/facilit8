"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { sendAweMessage, createAweConversation, type AweMessagePayload } from "@/lib/services/awe-chat.service";
import { subscribeToAwe, cancelAweSubscription } from "@/lib/services/awe-subscription.service";
import { aweMessageFormSchema } from "@/lib/validation/awe-chat";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";
import { siteUrl } from "@/lib/site";

export interface AweSendMessageState {
  error?: string;
  fieldErrors?: Record<string, string>;
  conversationId?: string;
  userMessage?: AweMessagePayload;
  assistantMessage?: AweMessagePayload;
}

export async function sendAweMessageAction(
  _prev: AweSendMessageState,
  formData: FormData
): Promise<AweSendMessageState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const parsed = aweMessageFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const conversationId = parsed.data.conversationId || null;
  const result = await sendAweMessage(session.user.id, session.user.role, conversationId, parsed.data.content);

  revalidatePath("/awe");
  if (result.conversationId) revalidatePath(`/awe/${result.conversationId}`);

  if (!result.success) {
    return { error: result.error, conversationId: result.conversationId, userMessage: result.userMessage };
  }
  return {
    conversationId: result.conversationId,
    userMessage: result.userMessage,
    assistantMessage: result.assistantMessage,
  };
}

export async function startAweConversationAction(): Promise<void> {
  const session = await auth();
  if (!session) redirect(`${siteUrl}/login`);

  const conversation = await createAweConversation(session.user.id);
  revalidatePath("/awe");
  redirect(`/awe/${conversation.id}`);
}

export async function subscribeToAweAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const result = await subscribeToAwe(session.user.id);
  if (!result.success) return { error: result.error };

  revalidatePath("/awe");
  redirect("/awe");
}

export async function cancelAweSubscriptionAction(): Promise<void> {
  const session = await auth();
  if (!session) redirect(`${siteUrl}/login`);

  await cancelAweSubscription(session.user.id);
  revalidatePath("/awe");
}
