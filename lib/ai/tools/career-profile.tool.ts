import { prisma } from "@/lib/db";
import type { AweTool } from "@/lib/ai/tools/types";
import { getCareerProfile, upsertCareerProfile } from "@/lib/services/awe-career-profile.service";

export const getUserSkillsTool: AweTool = {
  definition: {
    name: "get_user_skills",
    description:
      "Get the real, currently-recorded list of skills for this user — both their Facilit8 facilitator-profile skills (if they're a Facilitator) and any skills previously noted in their Awe career profile. Call this before making skill-gap or recommendation claims about what the user already knows.",
    inputSchema: { type: "object", properties: {} },
  },
  handler: async (_input, ctx) => {
    const [facilitatorSkills, careerProfile] = await Promise.all([
      prisma.facilitatorSkill.findMany({ where: { userId: ctx.userId }, select: { skill: { select: { name: true } } } }),
      getCareerProfile(ctx.userId),
    ]);

    const names = new Set<string>();
    for (const fs of facilitatorSkills) names.add(fs.skill.name);
    for (const s of careerProfile?.skills ?? []) names.add(s.skill.name);

    if (names.size === 0) return "This user has no recorded skills yet.";
    return JSON.stringify({ skills: [...names] });
  },
};

export const getCareerProfileTool: AweTool = {
  definition: {
    name: "get_career_profile",
    description:
      "Get this user's full saved career profile (current role, industry, years of experience, target role/industry, career goals, strengths, development areas, learning style). Call this at the start of a conversation if you need the full detail beyond the short summary already in your system prompt, or to confirm current values before updating them.",
    inputSchema: { type: "object", properties: {} },
  },
  handler: async (_input, ctx) => {
    const profile = await getCareerProfile(ctx.userId);
    if (!profile) return "This user has no saved career profile yet.";
    return JSON.stringify({
      currentRole: profile.currentRole,
      industry: profile.industry,
      yearsExperience: profile.yearsExperience,
      currentEmployer: profile.currentEmployer,
      targetRole: profile.targetRole,
      targetIndustry: profile.targetIndustry,
      careerGoals: profile.careerGoals,
      strengths: profile.strengths,
      developmentAreas: profile.developmentAreas,
      preferredLearningStyle: profile.preferredLearningStyle,
      skills: profile.skills.map((s) => s.skill.name),
    });
  },
};

export const updateCareerProfileTool: AweTool = {
  definition: {
    name: "update_career_profile",
    description:
      "Save durable facts the user has shared about their career to their profile, so future conversations remember them. Only pass fields that are actually new or changed information from this conversation — omit anything you don't have a confident update for. Skill names are matched against Facilit8's existing skill catalog; names that don't match anything are returned to you so you can tell the user rather than treating them as saved.",
    inputSchema: {
      type: "object",
      properties: {
        currentRole: { type: "string" },
        industry: { type: "string" },
        yearsExperience: { type: "number" },
        currentEmployer: { type: "string" },
        targetRole: { type: "string" },
        targetIndustry: { type: "string" },
        careerGoals: { type: "string", description: "Freeform narrative of what they want, e.g. 'become a people manager in 2 years'." },
        strengths: { type: "string" },
        developmentAreas: { type: "string" },
        preferredLearningStyle: { type: "string" },
        skillNames: { type: "array", items: { type: "string" }, description: "Skill names to attach, matched against the existing catalog." },
      },
    },
  },
  handler: async (input, ctx) => {
    const result = await upsertCareerProfile(ctx.userId, {
      currentRole: typeof input.currentRole === "string" ? input.currentRole : undefined,
      industry: typeof input.industry === "string" ? input.industry : undefined,
      yearsExperience: typeof input.yearsExperience === "number" ? input.yearsExperience : undefined,
      currentEmployer: typeof input.currentEmployer === "string" ? input.currentEmployer : undefined,
      targetRole: typeof input.targetRole === "string" ? input.targetRole : undefined,
      targetIndustry: typeof input.targetIndustry === "string" ? input.targetIndustry : undefined,
      careerGoals: typeof input.careerGoals === "string" ? input.careerGoals : undefined,
      strengths: typeof input.strengths === "string" ? input.strengths : undefined,
      developmentAreas: typeof input.developmentAreas === "string" ? input.developmentAreas : undefined,
      preferredLearningStyle: typeof input.preferredLearningStyle === "string" ? input.preferredLearningStyle : undefined,
      skillNames: Array.isArray(input.skillNames) ? input.skillNames.filter((s): s is string => typeof s === "string") : undefined,
    });

    if (result.unmatchedSkillNames.length > 0) {
      return JSON.stringify({ saved: true, unmatchedSkillNames: result.unmatchedSkillNames });
    }
    return JSON.stringify({ saved: true });
  },
};
