import { prisma } from "@/lib/db";

export async function getCareerProfile(userId: string) {
  return prisma.aweCareerProfile.findUnique({
    where: { userId },
    include: { skills: { include: { skill: true } } },
  });
}

type CareerProfileWithSkills = NonNullable<Awaited<ReturnType<typeof getCareerProfile>>>;

/** Short, pre-rendered summary injected into the system prompt every turn. */
export function summarizeCareerProfile(profile: CareerProfileWithSkills | null): string | null {
  if (!profile) return null;

  const lines: string[] = [];
  if (profile.currentRole) lines.push(`Current role: ${profile.currentRole}`);
  if (profile.industry) lines.push(`Industry: ${profile.industry}`);
  if (profile.yearsExperience != null) lines.push(`Years of experience: ${profile.yearsExperience}`);
  if (profile.currentEmployer) lines.push(`Current employer: ${profile.currentEmployer}`);
  if (profile.targetRole) lines.push(`Target role: ${profile.targetRole}`);
  if (profile.targetIndustry) lines.push(`Target industry: ${profile.targetIndustry}`);
  if (profile.careerGoals) lines.push(`Career goals: ${profile.careerGoals}`);
  if (profile.strengths) lines.push(`Strengths: ${profile.strengths}`);
  if (profile.developmentAreas) lines.push(`Development areas: ${profile.developmentAreas}`);
  if (profile.preferredLearningStyle) lines.push(`Preferred learning style: ${profile.preferredLearningStyle}`);
  if (profile.skills.length > 0) {
    lines.push(
      `Known skills: ${profile.skills.map((s) => s.skill.name + (s.proficiency ? ` (${s.proficiency})` : "")).join(", ")}`
    );
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

export interface UpsertCareerProfileInput {
  currentRole?: string;
  industry?: string;
  yearsExperience?: number;
  currentEmployer?: string;
  targetRole?: string;
  targetIndustry?: string;
  careerGoals?: string;
  strengths?: string;
  developmentAreas?: string;
  preferredLearningStyle?: string;
  skillNames?: string[];
}

/**
 * Incrementally updates a user's career profile. Only fields actually provided are
 * touched — this is called turn-by-turn as new facts surface in conversation, not as a
 * single big form submission. Skill names are matched against existing active Skill
 * rows only (case-insensitive); unmatched names are reported back so the caller (the
 * update_career_profile tool) can tell the model rather than inventing new taxonomy.
 */
export async function upsertCareerProfile(
  userId: string,
  input: UpsertCareerProfileInput
): Promise<{ unmatchedSkillNames: string[] }> {
  const { skillNames, ...fields } = input;
  const definedFields = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== undefined));

  const profile = await prisma.aweCareerProfile.upsert({
    where: { userId },
    create: { userId, ...definedFields },
    update: definedFields,
  });

  if (!skillNames || skillNames.length === 0) {
    return { unmatchedSkillNames: [] };
  }

  const matched = await prisma.skill.findMany({
    where: { isActive: true, name: { in: skillNames, mode: "insensitive" } },
  });

  if (matched.length > 0) {
    await prisma.$transaction(
      matched.map((skill) =>
        prisma.aweCareerProfileSkill.upsert({
          where: { profileId_skillId: { profileId: profile.id, skillId: skill.id } },
          create: { profileId: profile.id, skillId: skill.id },
          update: {},
        })
      )
    );
  }

  const matchedLower = new Set(matched.map((s) => s.name.toLowerCase()));
  const unmatchedSkillNames = skillNames.filter((name) => !matchedLower.has(name.toLowerCase()));

  return { unmatchedSkillNames };
}
