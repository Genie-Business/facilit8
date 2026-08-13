import { prisma } from "@/lib/db";
import { pusherTrigger } from "@/lib/pusher/server";
import { aweConversationChannel, EVENTS } from "@/lib/pusher/channels";
import { getChatModel } from "@/lib/ai/get-chat-model";
import { getToolDefinitions, executeTool } from "@/lib/ai/tools";
import { buildAweSystemPrompt } from "@/lib/ai/system-prompt";
import { getCareerProfile, summarizeCareerProfile } from "@/lib/services/awe-career-profile.service";
import { listEmploymentHistory } from "@/lib/services/employment-history.service";
import { listEducationHistory } from "@/lib/services/education-history.service";
import { hasAweAccess } from "@/lib/services/awe-subscription.service";
import type { ChatContentBlock, ChatModelMessage } from "@/lib/ai/provider";
import type { AweConversation, Role } from "@/lib/generated/prisma/client";

const MAX_TOOL_ROUNDS = 4;
const HISTORY_LIMIT = 30;

export interface AweMessagePayload {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
}

interface SendAweMessageResult {
  success: boolean;
  error?: string;
  conversationId?: string;
  userMessage?: AweMessagePayload;
  assistantMessage?: AweMessagePayload;
}

export async function listAweConversations(userId: string) {
  return prisma.aweConversation.findMany({
    where: { userId, archivedAt: null },
    orderBy: { updatedAt: "desc" },
    take: 50,
  });
}

export async function getAweConversation(id: string, userId: string) {
  return prisma.aweConversation.findFirst({
    where: { id, userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
}

export async function createAweConversation(userId: string): Promise<AweConversation> {
  return prisma.aweConversation.create({ data: { userId } });
}

function conversationTitleFromContent(content: string): string {
  const trimmed = content.trim().replace(/\s+/g, " ");
  return trimmed.length > 50 ? `${trimmed.slice(0, 50)}…` : trimmed;
}

function textBlocksFrom(content: ChatContentBlock[]): string {
  return content
    .filter((block): block is Extract<ChatContentBlock, { type: "text" }> => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/**
 * Runs one full turn of the Awe conversation loop: persist the user's message, call the
 * model, execute any tool calls it requests (capped at MAX_TOOL_ROUNDS), persist the
 * final assistant reply, and push it over Pusher. Never lets a tool-use loop run forever
 * — the final allowed round is called with no tools so the model is forced to answer in
 * text rather than request another round.
 */
export async function sendAweMessage(
  userId: string,
  role: Role,
  conversationId: string | null,
  content: string
): Promise<SendAweMessageResult> {
  const access = await hasAweAccess(userId);
  if (!access) return { success: false, error: "Awe requires an active subscription." };

  let conversation: AweConversation | null = null;
  if (conversationId) {
    conversation = await prisma.aweConversation.findFirst({ where: { id: conversationId, userId } });
    if (!conversation) return { success: false, error: "Conversation not found." };
  }
  if (!conversation) {
    conversation = await prisma.aweConversation.create({
      data: { userId, title: conversationTitleFromContent(content) },
    });
  }

  const userMessageRow = await prisma.aweMessage.create({
    data: { conversationId: conversation.id, role: "USER", content },
  });

  const [history, careerProfile, employmentHistory, educationHistory] = await Promise.all([
    prisma.aweMessage.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "asc" },
      take: HISTORY_LIMIT,
    }),
    getCareerProfile(userId),
    listEmploymentHistory(userId),
    listEducationHistory(userId),
  ]);

  const systemPrompt = buildAweSystemPrompt(
    summarizeCareerProfile(careerProfile, { employment: employmentHistory, education: educationHistory })
  );
  const chatModel = getChatModel();
  const tools = getToolDefinitions();

  const messages: ChatModelMessage[] = history
    .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
    .map((m) => ({
      role: m.role === "USER" ? ("user" as const) : ("assistant" as const),
      content: [{ type: "text", text: m.content }],
    }));

  const toolCallAudit: { name: string; input: unknown; resultSummary: string }[] = [];
  let finalContent: ChatContentBlock[] = [];

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const isLastAllowedRound = round === MAX_TOOL_ROUNDS;
      const response = await chatModel.complete({
        systemPrompt,
        messages,
        tools: isLastAllowedRound ? [] : tools,
      });

      if (response.stopReason !== "tool_use" || isLastAllowedRound) {
        finalContent = response.content;
        break;
      }

      messages.push({ role: "assistant", content: response.content });

      const toolResultBlocks: ChatContentBlock[] = [];
      for (const block of response.content) {
        if (block.type !== "tool_use") continue;
        const result = await executeTool(block.name, block.input, { userId, role });
        toolCallAudit.push({ name: block.name, input: block.input, resultSummary: result.content.slice(0, 500) });
        toolResultBlocks.push({ type: "tool_result", toolUseId: block.id, content: result.content, isError: result.isError });
      }

      messages.push({ role: "user", content: toolResultBlocks });
    }
  } catch (err) {
    // The user's message is already saved — surface a friendly error instead of a 500 so
    // it can be retried, rather than losing the exchange to an unhandled server crash.
    return {
      success: false,
      error: err instanceof Error ? err.message : "Awe is temporarily unavailable. Please try again shortly.",
      conversationId: conversation.id,
      userMessage: {
        id: userMessageRow.id,
        role: "USER",
        content: userMessageRow.content,
        createdAt: userMessageRow.createdAt.toISOString(),
      },
    };
  }

  const finalText = textBlocksFrom(finalContent) || "I wasn't able to finish that thought — could you try rephrasing?";

  const assistantMessage = await prisma.aweMessage.create({
    data: {
      conversationId: conversation.id,
      role: "ASSISTANT",
      content: finalText,
      toolCalls: toolCallAudit.length > 0 ? (toolCallAudit as never) : undefined,
    },
  });

  await prisma.aweConversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });

  await pusherTrigger(aweConversationChannel(conversation.id), EVENTS.AWE_MESSAGE_NEW, {
    id: assistantMessage.id,
    role: assistantMessage.role,
    content: assistantMessage.content,
    createdAt: assistantMessage.createdAt.toISOString(),
  });

  return {
    success: true,
    conversationId: conversation.id,
    userMessage: {
      id: userMessageRow.id,
      role: "USER",
      content: userMessageRow.content,
      createdAt: userMessageRow.createdAt.toISOString(),
    },
    assistantMessage: {
      id: assistantMessage.id,
      role: "ASSISTANT",
      content: assistantMessage.content,
      createdAt: assistantMessage.createdAt.toISOString(),
    },
  };
}
