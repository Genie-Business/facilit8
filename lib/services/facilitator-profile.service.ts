import { prisma } from "@/lib/db";
import type { FacilitationSkillName, ProficiencyLevel } from "@/lib/generated/prisma/client";
import { FACILITATION_SKILL_LABELS, PROFICIENCY_LABELS } from "@/lib/data/onboarding-options";

export async function getFacilitatorProfile(userId: string) {
  return prisma.facilitatorProfile.findUnique({ where: { userId } });
}

export async function getFacilitationSkillRatings(userId: string) {
  return prisma.facilitationSkillRating.findMany({ where: { userId } });
}

type FacilitatorProfileRow = NonNullable<Awaited<ReturnType<typeof getFacilitatorProfile>>>;
type SkillRatingRow = Awaited<ReturnType<typeof getFacilitationSkillRatings>>[number];

/** Short, pre-rendered summary injected into the system prompt for FACILITATOR users. */
export function summarizeFacilitatorProfile(
  profile: FacilitatorProfileRow | null,
  skillRatings: SkillRatingRow[]
): string | null {
  const lines: string[] = [];

  if (profile) {
    if (profile.yearsFacilitating != null) lines.push(`Years facilitating: ${profile.yearsFacilitating}`);
    if (profile.sessionsDelivered != null) lines.push(`Sessions delivered: ${profile.sessionsDelivered}`);
    if (profile.delegatesTrained != null) lines.push(`Delegates trained: ${profile.delegatesTrained}`);
    if (profile.typicalAudienceSize) lines.push(`Typical audience size: ${profile.typicalAudienceSize}`);
    if (profile.typicalAudienceSeniority)
      lines.push(`Typical audience seniority: ${profile.typicalAudienceSeniority}`);
    if (profile.trainingFormats.length > 0)
      lines.push(`Training formats delivered: ${profile.trainingFormats.join(", ")}`);
    if (profile.industriesServed.length > 0)
      lines.push(`Industries served: ${profile.industriesServed.join(", ")}`);
    if (profile.canTrainNow.length > 0)
      lines.push(`Can confidently train on today: ${profile.canTrainNow.join(", ")}`);
    if (profile.wantToTrain.length > 0)
      lines.push(`Wants to become qualified to train on: ${profile.wantToTrain.join(", ")}`);
    if (profile.facilitatorGoals) lines.push(`Facilitator goals: ${profile.facilitatorGoals}`);
  }

  if (skillRatings.length > 0) {
    const summary = skillRatings
      .map((r) => `${FACILITATION_SKILL_LABELS[r.skill] ?? r.skill} (${PROFICIENCY_LABELS[r.proficiency] ?? r.proficiency})`)
      .join(", ");
    lines.push(`Facilitation skill self-ratings: ${summary}`);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

export interface UpsertFacilitatorProfileInput {
  yearsFacilitating?: number | null;
  sessionsDelivered?: number | null;
  delegatesTrained?: number | null;
  typicalAudienceSize?: string | null;
  typicalAudienceSeniority?: string | null;
  trainingFormats?: string[];
  industriesServed?: string[];
  canTrainNow?: string[];
  wantToTrain?: string[];
  facilitatorGoals?: string | null;
}

export async function upsertFacilitatorProfile(userId: string, input: UpsertFacilitatorProfileInput) {
  const definedFields = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
  return prisma.facilitatorProfile.upsert({
    where: { userId },
    create: { userId, ...definedFields },
    update: definedFields,
  });
}

/** Replaces this facilitator's entire skill-rating set — the form resubmits all ratings
 * together each time, so a full replace is simpler and safer than a partial diff. */
export async function setFacilitationSkillRatings(
  userId: string,
  ratings: { skill: FacilitationSkillName; proficiency: ProficiencyLevel }[]
): Promise<void> {
  await prisma.$transaction([
    prisma.facilitationSkillRating.deleteMany({ where: { userId } }),
    ...(ratings.length > 0
      ? [
          prisma.facilitationSkillRating.createMany({
            data: ratings.map((r) => ({ userId, skill: r.skill, proficiency: r.proficiency })),
          }),
        ]
      : []),
  ]);
}
