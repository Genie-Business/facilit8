// Provider-agnostic chat model interface — deliberately not shaped like any single
// vendor's SDK types, so a future provider (e.g. OpenAI) only has to satisfy this
// interface. Nothing outside lib/ai/providers/* should import an SDK's own types.

export type ChatContentBlock =
  | { type: "text"; text: string }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; toolUseId: string; content: string; isError?: boolean };

export interface ChatModelMessage {
  role: "user" | "assistant";
  content: ChatContentBlock[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export type ChatStopReason = "end_turn" | "tool_use" | "max_tokens" | "refusal" | string;

export interface ChatModelResponse {
  content: ChatContentBlock[];
  stopReason: ChatStopReason;
}

export interface ChatModel {
  complete(params: {
    systemPrompt: string;
    messages: ChatModelMessage[];
    tools: ToolDefinition[];
  }): Promise<ChatModelResponse>;
}
