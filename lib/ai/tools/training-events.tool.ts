import { prisma } from "@/lib/db";
import type { AweTool } from "@/lib/ai/tools/types";

const MAX_RESULTS = 8;

function clampLimit(input: Record<string, unknown>): number {
  const raw = typeof input.limit === "number" ? input.limit : Number(input.limit);
  if (!Number.isFinite(raw) || raw <= 0) return 5;
  return Math.min(Math.round(raw), MAX_RESULTS);
}

function textFilter(query: unknown) {
  if (typeof query !== "string" || !query.trim()) return undefined;
  const q = query.trim();
  return { contains: q, mode: "insensitive" as const };
}

export const searchTrainingEventsTool: AweTool = {
  definition: {
    name: "search_training_events",
    description:
      "Search Facilit8's live, currently open standard training events (posted by Event Managers, funded, still accepting facilitator applications). Call this whenever you need to recommend or discuss real training opportunities on the platform — never invent event titles, dates, or budgets. Returns only events that are actually open right now; it does not include completed, cancelled, or not-yet-funded events.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text match against title, skill type, category, or location (optional)." },
        limit: { type: "number", description: `Max results to return (default 5, max ${MAX_RESULTS}).` },
      },
    },
  },
  handler: async (input) => {
    const q = textFilter(input.query);
    const events = await prisma.trainingEvent.findMany({
      where: {
        approval: "APPROVED",
        isAvailable: true,
        ...(q
          ? { OR: [{ title: q }, { skillType: q }, { eventCategory: q }, { location: q }, { delegatesLevel: q }] }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: clampLimit(input),
      select: {
        title: true,
        slug: true,
        location: true,
        skillType: true,
        eventCategory: true,
        delegatesLevel: true,
        venueType: true,
        startDate: true,
        endDate: true,
        trainingBudget: true,
      },
    });

    if (events.length === 0) {
      return "No currently-open training events matched that search.";
    }

    return JSON.stringify(
      events.map((e) => ({
        kind: "standard_training_event",
        title: e.title,
        url: `/events/${e.slug}`,
        location: e.location,
        skillType: e.skillType,
        category: e.eventCategory,
        delegatesLevel: e.delegatesLevel,
        venueType: e.venueType,
        startDate: e.startDate.toISOString().slice(0, 10),
        endDate: e.endDate.toISOString().slice(0, 10),
        budgetNaira: Number(e.trainingBudget),
      }))
    );
  },
};

export const searchMergedTrainingEventsTool: AweTool = {
  definition: {
    name: "search_merged_training_events",
    description:
      "Search Facilit8's live, publicly posted merged (pooled/crowdfunded) training sessions that don't yet have a selected facilitator. Call this alongside search_training_events when discussing real training opportunities — never invent titles, dates, or prices. Does not include invite-only sessions the user isn't part of, cancelled sessions, or sessions that already have a facilitator selected.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text match against title, category, or location (optional)." },
        limit: { type: "number", description: `Max results to return (default 5, max ${MAX_RESULTS}).` },
      },
    },
  },
  handler: async (input) => {
    const q = textFilter(input.query);
    const events = await prisma.mergedTrainingEvent.findMany({
      where: {
        isPostedToBoard: true,
        cancelled: false,
        selectedTrainerId: null,
        ...(q ? { OR: [{ title: q }, { eventCategory: q }, { location: q }, { delegatesLevel: q }] } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: clampLimit(input),
      select: {
        title: true,
        slug: true,
        location: true,
        eventCategory: true,
        delegatesLevel: true,
        venueType: true,
        startDate: true,
        endDate: true,
        pricePerDelegate: true,
        totalSlots: true,
      },
    });

    if (events.length === 0) {
      return "No currently-open merged training sessions matched that search.";
    }

    return JSON.stringify(
      events.map((e) => ({
        kind: "merged_training_event",
        title: e.title,
        url: `/merged-trainings/${e.slug}`,
        location: e.location,
        category: e.eventCategory,
        delegatesLevel: e.delegatesLevel,
        venueType: e.venueType,
        startDate: e.startDate.toISOString().slice(0, 10),
        endDate: e.endDate.toISOString().slice(0, 10),
        pricePerDelegateNaira: Number(e.pricePerDelegate),
        totalSlots: e.totalSlots,
      }))
    );
  },
};
