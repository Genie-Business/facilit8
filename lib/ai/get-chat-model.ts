import type { ChatModel } from "@/lib/ai/provider";
import { AnthropicChatModel } from "@/lib/ai/providers/anthropic";

const globalForAwe = globalThis as unknown as { aweChatModel: ChatModel | undefined };

/**
 * The entire surface a future provider needs to plug into: add a new branch here and a
 * new lib/ai/providers/*.ts implementing ChatModel — nothing else in the app changes.
 */
export function getChatModel(): ChatModel {
  if (globalForAwe.aweChatModel) return globalForAwe.aweChatModel;

  const provider = process.env.AWE_LLM_PROVIDER || "anthropic";
  const model = provider === "anthropic" ? new AnthropicChatModel() : new AnthropicChatModel();

  globalForAwe.aweChatModel = model;
  return model;
}
