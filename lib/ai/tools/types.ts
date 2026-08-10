import type { ToolDefinition } from "@/lib/ai/provider";
import type { Role } from "@/lib/generated/prisma/client";

export interface ToolContext {
  userId: string;
  role: Role;
}

export interface AweTool {
  definition: ToolDefinition;
  handler: (input: Record<string, unknown>, ctx: ToolContext) => Promise<string>;
}
