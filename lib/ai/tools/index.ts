import type { ToolDefinition } from "@/lib/ai/provider";
import type { AweTool, ToolContext } from "@/lib/ai/tools/types";
import { searchTrainingEventsTool, searchMergedTrainingEventsTool } from "@/lib/ai/tools/training-events.tool";
import { searchFacilitatorsTool, getFacilitatorProfileTool } from "@/lib/ai/tools/facilitators.tool";
import { getUserSkillsTool, getCareerProfileTool, updateCareerProfileTool } from "@/lib/ai/tools/career-profile.tool";

export const AWE_TOOLS: AweTool[] = [
  searchTrainingEventsTool,
  searchMergedTrainingEventsTool,
  searchFacilitatorsTool,
  getFacilitatorProfileTool,
  getUserSkillsTool,
  getCareerProfileTool,
  updateCareerProfileTool,
];

const TOOLS_BY_NAME = new Map(AWE_TOOLS.map((tool) => [tool.definition.name, tool]));

export function getToolDefinitions(): ToolDefinition[] {
  return AWE_TOOLS.map((tool) => tool.definition);
}

export async function executeTool(name: string, input: Record<string, unknown>, ctx: ToolContext): Promise<{ content: string; isError: boolean }> {
  const tool = TOOLS_BY_NAME.get(name);
  if (!tool) {
    return { content: `Unknown tool "${name}".`, isError: true };
  }
  try {
    const content = await tool.handler(input, ctx);
    return { content, isError: false };
  } catch (err) {
    return { content: err instanceof Error ? err.message : "Tool execution failed.", isError: true };
  }
}
