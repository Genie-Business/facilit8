import { prisma } from "@/lib/db";

export async function getCareerProfile(userId: string) {
  return prisma.aweCareerProfile.findUnique({
    where: { userId },
    include: { skills: { include: { skill: true } } },
  });
}

type CareerProfileWithSkills = NonNullable<Awaited<ReturnType<typeof getCareerProfile>>>;

export interface CareerHistoryForSummary {
  employment?: { companyName: string; jobTitle: string; startDate: Date; endDate: Date | null; isCurrent: boolean }[];
  education?: { institution: string; qualification: string; fieldOfStudy: string | null; endDate: Date | null }[];
}

function formatYear(date: Date): string {
  return String(date.getFullYear());
}

/** Short, pre-rendered summary injected into the system prompt every turn. */
export function summarizeCareerProfile(
  profile: CareerProfileWithSkills | null,
  history?: CareerHistoryForSummary
): string | null {
  const lines: string[] = [];

  if (profile) {
    if (profile.currentRole) lines.push(`Current role: ${profile.currentRole}`);
    if (profile.industry) lines.push(`Industry: ${profile.industry}`);
    if (profile.yearsExperience != null) lines.push(`Years of experience: ${profile.yearsExperience}`);
    if (profile.currentEmployer) lines.push(`Current employer: ${profile.currentEmployer}`);
    if (profile.highestEducationLevel) lines.push(`Highest education level: ${profile.highestEducationLevel}`);
    if (profile.professionalMemberships.length > 0)
      lines.push(`Professional memberships: ${profile.professionalMemberships.join(", ")}`);
    if (profile.certifications.length > 0) lines.push(`Certifications: ${profile.certifications.join(", ")}`);
    if (profile.languagesSpoken.length > 0) lines.push(`Languages spoken: ${profile.languagesSpoken.join(", ")}`);

    if (profile.targetRole) lines.push(`Target role: ${profile.targetRole}`);
    if (profile.targetIndustry) lines.push(`Target industry: ${profile.targetIndustry}`);
    if (profile.targetCareerLevel) lines.push(`Target career level: ${profile.targetCareerLevel}`);
    if (profile.targetTimeline) lines.push(`Timeline for reaching goals: ${profile.targetTimeline}`);
    if (profile.longTermAmbition) lines.push(`Long-term ambition: ${profile.longTermAmbition}`);
    if (profile.careerGoalTags.length > 0) lines.push(`Career goals: ${profile.careerGoalTags.join(", ")}`);
    if (profile.careerGoals) lines.push(`Career goals (in their words): ${profile.careerGoals}`);
    if (profile.topStrengths.length > 0) lines.push(`Top strengths: ${profile.topStrengths.join(", ")}`);
    if (profile.strengths) lines.push(`Strengths (in their words): ${profile.strengths}`);
    if (profile.skillsToImprove.length > 0) lines.push(`Skills to improve: ${profile.skillsToImprove.join(", ")}`);
    if (profile.weakSkills.length > 0) lines.push(`Weak skills: ${profile.weakSkills.join(", ")}`);
    if (profile.skillsToAcquire.length > 0) lines.push(`Skills to acquire: ${profile.skillsToAcquire.join(", ")}`);
    if (profile.developmentAreas) lines.push(`Development areas (in their words): ${profile.developmentAreas}`);
    if (profile.challengeTags.length > 0) lines.push(`Challenges: ${profile.challengeTags.join(", ")}`);
    if (profile.challengeOther) lines.push(`Other challenges: ${profile.challengeOther}`);

    if (profile.learningFormats.length > 0)
      lines.push(`Preferred learning formats: ${profile.learningFormats.join(", ")}`);
    if (profile.availableLearningTime) lines.push(`Time available for learning: ${profile.availableLearningTime}`);
    if (profile.preferredSchedule.length > 0)
      lines.push(`Preferred learning schedule: ${profile.preferredSchedule.join(", ")}`);
    if (profile.preferredDelivery) lines.push(`Preferred learning delivery: ${profile.preferredDelivery}`);
    if (profile.preferredLearningStyle) lines.push(`Preferred learning style: ${profile.preferredLearningStyle}`);

    if (profile.skills.length > 0) {
      lines.push(
        `Known skills: ${profile.skills.map((s) => s.skill.name + (s.proficiency ? ` (${s.proficiency})` : "")).join(", ")}`
      );
    }

    if (profile.tellAweText) lines.push(`In their own words: ${profile.tellAweText}`);
  }

  if (history?.employment && history.employment.length > 0) {
    const progression = history.employment
      .map(
        (e) =>
          `${e.jobTitle} at ${e.companyName} (${formatYear(e.startDate)}–${e.isCurrent ? "present" : e.endDate ? formatYear(e.endDate) : "?"})`
      )
      .join("; ");
    lines.push(`Employment history (most recent first): ${progression}`);
  }

  if (history?.education && history.education.length > 0) {
    const summary = history.education
      .map((e) => `${e.qualification}${e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ""}, ${e.institution}`)
      .join("; ");
    lines.push(`Education: ${summary}`);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

export interface UpsertCareerProfileInput {
  currentRole?: string | null;
  industry?: string | null;
  yearsExperience?: number | null;
  currentEmployer?: string | null;
  targetRole?: string | null;
  targetIndustry?: string | null;
  careerGoals?: string | null;
  strengths?: string | null;
  developmentAreas?: string | null;
  preferredLearningStyle?: string | null;
  skillNames?: string[];

  // Onboarding wizard fields — see AweCareerProfile in schema.prisma for the step each
  // group belongs to.
  highestEducationLevel?: string | null;
  professionalMemberships?: string[];
  certifications?: string[];
  languagesSpoken?: string[];
  careerGoalTags?: string[];
  targetCareerLevel?: string | null;
  targetTimeline?: string | null;
  longTermAmbition?: string | null;
  topStrengths?: string[];
  skillsToImprove?: string[];
  weakSkills?: string[];
  skillsToAcquire?: string[];
  challengeTags?: string[];
  challengeOther?: string | null;
  learningFormats?: string[];
  availableLearningTime?: string | null;
  preferredSchedule?: string[];
  preferredDelivery?: string | null;
  tellAweText?: string | null;
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

/**
 * Replaces a user's career-profile skill links by id (checkbox picker in onboarding),
 * as opposed to upsertCareerProfile's skillNames matching (used by the Awe chat tool,
 * which only has names to work with, not ids).
 */
export async function setCareerProfileSkillIds(userId: string, skillIds: string[]): Promise<void> {
  const profile = await prisma.aweCareerProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });

  await prisma.$transaction([
    prisma.aweCareerProfileSkill.deleteMany({ where: { profileId: profile.id } }),
    ...(skillIds.length > 0
      ? [
          prisma.aweCareerProfileSkill.createMany({
            data: skillIds.map((skillId) => ({ profileId: profile.id, skillId })),
            skipDuplicates: true,
          }),
        ]
      : []),
  ]);
}
