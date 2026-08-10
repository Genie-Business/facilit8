import { prisma } from "@/lib/db";
import type { AweTool } from "@/lib/ai/tools/types";

const MAX_RESULTS = 8;

function clampLimit(input: Record<string, unknown>): number {
  const raw = typeof input.limit === "number" ? input.limit : Number(input.limit);
  if (!Number.isFinite(raw) || raw <= 0) return 5;
  return Math.min(Math.round(raw), MAX_RESULTS);
}

export const searchFacilitatorsTool: AweTool = {
  definition: {
    name: "search_facilitators",
    description:
      "Search Facilit8's real facilitator directory — actual people with profiles on the platform. Call this when discussing who could deliver training in a given area, or when a user asks about facilitators/trainers with a certain specialization. Never invent facilitator names, ratings, or specializations. Matches against specialization and skill names.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text match against specialization or a skill name (optional)." },
        limit: { type: "number", description: `Max results to return (default 5, max ${MAX_RESULTS}).` },
      },
    },
  },
  handler: async (input) => {
    const query = typeof input.query === "string" ? input.query.trim() : "";
    const facilitators = await prisma.user.findMany({
      where: {
        role: "FACILITATOR",
        ...(query
          ? {
              OR: [
                { specialization: { contains: query, mode: "insensitive" } },
                { facilitatorSkills: { some: { skill: { name: { contains: query, mode: "insensitive" } } } } },
              ],
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: clampLimit(input),
      select: {
        firstName: true,
        lastName: true,
        slug: true,
        specialization: true,
        qualification: true,
        experience: true,
        state: true,
        facilitatorSkills: { select: { skill: { select: { name: true } } } },
      },
    });

    if (facilitators.length === 0) {
      return "No facilitators matched that search.";
    }

    return JSON.stringify(
      facilitators.map((f) => ({
        name: `${f.firstName} ${f.lastName}`,
        url: `/facilitators/${f.slug}`,
        specialization: f.specialization,
        qualification: f.qualification,
        experience: f.experience,
        state: f.state,
        skills: f.facilitatorSkills.map((fs) => fs.skill.name),
      }))
    );
  },
};

export const getFacilitatorProfileTool: AweTool = {
  definition: {
    name: "get_facilitator_profile",
    description:
      "Get a specific facilitator's full real profile, including their average rating and review count from actual completed trainings. Call this when you need details on one named facilitator already surfaced by search_facilitators, or when the user names a specific facilitator by their profile slug.",
    inputSchema: {
      type: "object",
      properties: {
        slug: { type: "string", description: "The facilitator's profile slug (from a prior search_facilitators result's url)." },
      },
      required: ["slug"],
    },
  },
  handler: async (input) => {
    const slug = typeof input.slug === "string" ? input.slug : "";
    if (!slug) return "No facilitator slug was provided.";

    const facilitator = await prisma.user.findUnique({
      where: { slug, role: "FACILITATOR" },
      select: {
        firstName: true,
        lastName: true,
        slug: true,
        specialization: true,
        qualification: true,
        experience: true,
        profileDescription: true,
        state: true,
        facilitatorSkills: { select: { skill: { select: { name: true } } } },
        reviewsReceived: { select: { rating: true } },
      },
    });

    if (!facilitator) return "No facilitator was found with that slug.";

    const ratingCount = facilitator.reviewsReceived.length;
    const avgRating =
      ratingCount > 0 ? facilitator.reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / ratingCount : null;

    return JSON.stringify({
      name: `${facilitator.firstName} ${facilitator.lastName}`,
      url: `/facilitators/${facilitator.slug}`,
      specialization: facilitator.specialization,
      qualification: facilitator.qualification,
      experience: facilitator.experience,
      bio: facilitator.profileDescription,
      state: facilitator.state,
      skills: facilitator.facilitatorSkills.map((fs) => fs.skill.name),
      averageRating: avgRating,
      reviewCount: ratingCount,
    });
  },
};
