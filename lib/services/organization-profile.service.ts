import { prisma } from "@/lib/db";

export async function getOrganizationProfile(organizationId: string) {
  return prisma.organizationProfile.findUnique({ where: { organizationId } });
}

type OrganizationProfileRow = NonNullable<Awaited<ReturnType<typeof getOrganizationProfile>>>;

/** Short, pre-rendered summary injected into the system prompt for EVENT_MANAGER users. */
export function summarizeOrganizationProfile(
  organizationName: string | null,
  profile: OrganizationProfileRow | null
): string | null {
  const lines: string[] = [];
  if (organizationName) lines.push(`Organization: ${organizationName}`);

  if (profile) {
    if (profile.organizationType) lines.push(`Organization type: ${profile.organizationType}`);
    if (profile.employeeCountBand) lines.push(`Employee count: ${profile.employeeCountBand}`);
    if (profile.locations.length > 0) lines.push(`Locations: ${profile.locations.join(", ")}`);
    if (profile.yearEstablished != null) lines.push(`Year established: ${profile.yearEstablished}`);
    if (profile.departments.length > 0) lines.push(`Departments: ${profile.departments.join(", ")}`);
    if (profile.workforceLevels.length > 0) lines.push(`Workforce levels: ${profile.workforceLevels.join(", ")}`);
    if (profile.trainingNeeds.length > 0) lines.push(`Training needs: ${profile.trainingNeeds.join(", ")}`);
    if (profile.workforceChallenges.length > 0)
      lines.push(`Workforce challenges: ${profile.workforceChallenges.join(", ")}`);
    if (profile.preferredFormat) lines.push(`Preferred training format: ${profile.preferredFormat}`);
    if (profile.preferredLocation) lines.push(`Preferred training location: ${profile.preferredLocation}`);
    if (profile.preferredSchedule.length > 0)
      lines.push(`Preferred training schedule: ${profile.preferredSchedule.join(", ")}`);
    if (profile.trainingFrequency) lines.push(`Training frequency: ${profile.trainingFrequency}`);
    if (profile.typicalDuration) lines.push(`Typical training duration: ${profile.typicalDuration}`);
    if (profile.typicalClassSize) lines.push(`Typical class size: ${profile.typicalClassSize}`);
    if (profile.budgetRange) lines.push(`Typical training budget: ${profile.budgetRange} ${profile.budgetCurrency}`);
    if (profile.typicalAudience) lines.push(`Typical training audience: ${profile.typicalAudience}`);
    if (profile.strategicInitiatives.length > 0)
      lines.push(`Strategic initiatives: ${profile.strategicInitiatives.join(", ")}`);
    if (profile.skillsNeeded.length > 0) lines.push(`Skills the workforce needs: ${profile.skillsNeeded.join(", ")}`);
    if (profile.biggestChallenge)
      lines.push(`Biggest workforce-development problem to solve: ${profile.biggestChallenge}`);
    if (profile.learningCulture) lines.push(`Learning culture: ${profile.learningCulture}`);
    if (profile.participationBarriers.length > 0)
      lines.push(`Training participation barriers: ${profile.participationBarriers.join(", ")}`);
  }

  return lines.length > 0 ? lines.join("\n") : null;
}

export interface UpsertOrganizationProfileInput {
  organizationType?: string | null;
  website?: string | null;
  employeeCountBand?: string | null;
  locations?: string[];
  yearEstablished?: number | null;
  departments?: string[];
  workforceLevels?: string[];
  trainingNeeds?: string[];
  workforceChallenges?: string[];
  preferredFormat?: string | null;
  preferredLocation?: string | null;
  preferredSchedule?: string[];
  trainingFrequency?: string | null;
  typicalDuration?: string | null;
  typicalClassSize?: string | null;
  budgetRange?: string | null;
  budgetCurrency?: string;
  typicalAudience?: string | null;
  strategicInitiatives?: string[];
  skillsNeeded?: string[];
  biggestChallenge?: string | null;
  learningCulture?: string | null;
  participationBarriers?: string[];
}

export async function upsertOrganizationProfile(organizationId: string, input: UpsertOrganizationProfileInput) {
  const definedFields = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
  return prisma.organizationProfile.upsert({
    where: { organizationId },
    create: { organizationId, ...definedFields },
    update: definedFields,
  });
}
