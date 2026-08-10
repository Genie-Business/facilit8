import Anthropic from "@anthropic-ai/sdk";
import type {
  MessageParam,
  ContentBlockParam,
  Tool,
} from "@anthropic-ai/sdk/resources/messages";

import type { ChatContentBlock, ChatModel, ChatModelMessage, ChatModelResponse, ToolDefinition } from "@/lib/ai/provider";

const DEFAULT_MODEL = "claude-sonnet-5";

function toAnthropicContent(blocks: ChatContentBlock[]): ContentBlockParam[] {
  return blocks.map((block) => {
    if (block.type === "text") return { type: "text", text: block.text };
    if (block.type === "tool_use") {
      return { type: "tool_use", id: block.id, name: block.name, input: block.input };
    }
    return {
      type: "tool_result",
      tool_use_id: block.toolUseId,
      content: block.content,
      is_error: block.isError,
    };
  });
}

function fromAnthropicContent(blocks: Anthropic.ContentBlock[]): ChatContentBlock[] {
  const out: ChatContentBlock[] = [];
  for (const block of blocks) {
    if (block.type === "text") {
      out.push({ type: "text", text: block.text });
    } else if (block.type === "tool_use") {
      out.push({ type: "tool_use", id: block.id, name: block.name, input: (block.input as Record<string, unknown>) ?? {} });
    }
    // Other block types (thinking, server-tool results, etc.) aren't relevant to Awe's
    // conversational tool-use loop and are intentionally dropped here.
  }
  return out;
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured. Awe cannot respond until this is set.");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export class AnthropicChatModel implements ChatModel {
  async complete(params: {
    systemPrompt: string;
    messages: ChatModelMessage[];
    tools: ToolDefinition[];
  }): Promise<ChatModelResponse> {
    const model = process.env.AWE_ANTHROPIC_MODEL || DEFAULT_MODEL;

    const anthropicTools: Tool[] = params.tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.inputSchema as Tool.InputSchema,
    }));

    const messages: MessageParam[] = params.messages.map((message) => ({
      role: message.role,
      content: toAnthropicContent(message.content),
    }));

    const response = await getClient().messages.create({
      model,
      max_tokens: 4096,
      system: params.systemPrompt,
      messages,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      output_config: { effort: "medium" },
    });

    if (response.stop_reason === "refusal") {
      return {
        content: [{ type: "text", text: "I'm not able to help with that request. Let's talk about your career or professional development instead." }],
        stopReason: "refusal",
      };
    }

    return {
      content: fromAnthropicContent(response.content),
      stopReason: response.stop_reason ?? "end_turn",
    };
  }
}
