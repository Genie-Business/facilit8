"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";
import { setFacilitatorSkills } from "@/lib/services/skill.service";
import { upsertCareerProfile, setCareerProfileSkillIds } from "@/lib/services/awe-career-profile.service";
import {
  createEmploymentHistory,
  updateEmploymentHistory,
  deleteEmploymentHistory,
} from "@/lib/services/employment-history.service";
import {
  createEducationHistory,
  updateEducationHistory,
  deleteEducationHistory,
} from "@/lib/services/education-history.service";
import {
  createProfessionalDevelopment,
  deleteProfessionalDevelopment,
} from "@/lib/services/professional-development.service";
import { upsertFacilitatorProfile, setFacilitationSkillRatings } from "@/lib/services/facilitator-profile.service";
import { upsertOrganizationProfile } from "@/lib/services/organization-profile.service";
import { getUserOrganizationMembership } from "@/lib/services/organization.service";
import {
  professionalProfileSchema,
  employmentHistoryFormSchema,
  educationHistoryFormSchema,
  professionalDevelopmentFormSchema,
  careerDirectionSchema,
  learningPreferencesSchema,
  facilitatorProfileSchema,
  organizationProfileSchema,
  meetAweSchema,
} from "@/lib/validation/onboarding";
import { resolveOnboardingRoute, stepAfterLearningPreferences, MEET_AWE_STEP } from "@/lib/onboarding/steps";
import { FACILITATION_SKILL_LABELS } from "@/lib/data/onboarding-options";
import type { FacilitationSkillName, ProficiencyLevel } from "@/lib/generated/prisma/client";

async function requireUser() {
  const session = await auth();
  if (!session) redirect("/login");
  return session.user;
}

/** Only moves the resume cursor forward — revisiting an earlier step never regresses it. */
async function advanceStep(userId: string, step: number) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { onboardingStep: true } });
  if (user && user.onboardingStep < step) {
    await prisma.user.update({ where: { id: userId }, data: { onboardingStep: step } });
  }
}

/** The employment/education/professional-development CRUD actions below are used both by
 * the onboarding wizard's "Your Background" step and by the post-onboarding /profile/background
 * settings page — revalidate both so whichever one is currently mounted picks up the change. */
function revalidateBackgroundPaths() {
  revalidatePath("/onboarding/background");
  revalidatePath("/profile/background");
}

export async function updateProfessionalProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const raw = { ...Object.fromEntries(formData), skillIds: formData.getAll("skillIds") };
  const parsed = professionalProfileSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  const data = parsed.data;

  if (data.profileImageUrl) {
    await prisma.user.update({ where: { id: user.id }, data: { profileImageUrl: data.profileImageUrl } });
  }

  await upsertCareerProfile(user.id, {
    currentRole: data.currentRole,
    currentEmployer: data.currentEmployer,
    industry: data.industry,
    yearsExperience: data.yearsExperience,
    highestEducationLevel: data.highestEducationLevel,
    professionalMemberships: data.professionalMemberships,
    certifications: data.certifications,
    languagesSpoken: data.languagesSpoken,
  });

  if (data.skillIds) {
    await setCareerProfileSkillIds(user.id, data.skillIds);
    if (user.role === "FACILITATOR") {
      await setFacilitatorSkills(user.id, data.skillIds);
    }
  }

  await advanceStep(user.id, 1);
  revalidatePath("/onboarding");
  redirect("/onboarding/background");
}

export async function addEmploymentHistoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const raw = { ...Object.fromEntries(formData), isCurrent: formData.get("isCurrent") === "on" };
  const parsed = employmentHistoryFormSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };

  await createEmploymentHistory(user.id, parsed.data);
  revalidateBackgroundPaths();
  return { success: "Employment record added." };
}

export async function editEmploymentHistoryAction(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const raw = { ...Object.fromEntries(formData), isCurrent: formData.get("isCurrent") === "on" };
  const parsed = employmentHistoryFormSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };

  await updateEmploymentHistory(id, user.id, parsed.data);
  revalidateBackgroundPaths();
  return { success: "Employment record updated." };
}

export async function deleteEmploymentHistoryAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteEmploymentHistory(id, user.id);
  revalidateBackgroundPaths();
}

export async function addEducationHistoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = educationHistoryFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };

  await createEducationHistory(user.id, parsed.data);
  revalidateBackgroundPaths();
  return { success: "Education record added." };
}

export async function editEducationHistoryAction(
  id: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = educationHistoryFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };

  await updateEducationHistory(id, user.id, parsed.data);
  revalidateBackgroundPaths();
  return { success: "Education record updated." };
}

export async function deleteEducationHistoryAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteEducationHistory(id, user.id);
  revalidateBackgroundPaths();
}

export async function addProfessionalDevelopmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = professionalDevelopmentFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };

  await createProfessionalDevelopment(user.id, parsed.data);
  revalidateBackgroundPaths();
  return { success: "Record added." };
}

export async function deleteProfessionalDevelopmentAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteProfessionalDevelopment(id, user.id);
  revalidateBackgroundPaths();
}

export async function continueFromBackgroundAction(): Promise<void> {
  const user = await requireUser();
  await advanceStep(user.id, 2);
  redirect("/onboarding/career-direction");
}

export async function updateCareerDirectionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const raw = {
    ...Object.fromEntries(formData),
    careerGoalTags: formData.getAll("careerGoalTags"),
    challengeTags: formData.getAll("challengeTags"),
  };
  const parsed = careerDirectionSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  const data = parsed.data;

  await upsertCareerProfile(user.id, {
    targetRole: data.targetRole,
    targetIndustry: data.targetIndustry,
    targetCareerLevel: data.targetCareerLevel,
    targetTimeline: data.targetTimeline,
    longTermAmbition: data.longTermAmbition,
    careerGoalTags: data.careerGoalTags,
    topStrengths: data.topStrengths,
    skillsToImprove: data.skillsToImprove,
    weakSkills: data.weakSkills,
    skillsToAcquire: data.skillsToAcquire,
    challengeTags: data.challengeTags,
    challengeOther: data.challengeOther,
  });

  await advanceStep(user.id, 3);
  revalidatePath("/onboarding");
  redirect("/onboarding/learning-preferences");
}

export async function updateLearningPreferencesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const raw = {
    ...Object.fromEntries(formData),
    learningFormats: formData.getAll("learningFormats"),
    preferredSchedule: formData.getAll("preferredSchedule"),
  };
  const parsed = learningPreferencesSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  const data = parsed.data;

  await upsertCareerProfile(user.id, {
    learningFormats: data.learningFormats,
    availableLearningTime: data.availableLearningTime,
    preferredSchedule: data.preferredSchedule,
    preferredDelivery: data.preferredDelivery,
    preferredLearningStyle: data.preferredLearningStyle,
  });

  const nextStep = stepAfterLearningPreferences(user.role);
  await advanceStep(user.id, nextStep);
  revalidatePath("/onboarding");
  redirect(resolveOnboardingRoute(nextStep, user.role));
}

export async function updateFacilitatorProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const skillRatings = (Object.keys(FACILITATION_SKILL_LABELS) as (keyof typeof FACILITATION_SKILL_LABELS)[])
    .map((skill) => {
      const proficiency = formData.get(`skillRating_${skill}`);
      return typeof proficiency === "string" && proficiency ? { skill, proficiency } : null;
    })
    .filter((r): r is { skill: string; proficiency: string } => r !== null);

  const raw = {
    ...Object.fromEntries(formData),
    trainingFormats: formData.getAll("trainingFormats"),
    skillRatings,
  };
  const parsed = facilitatorProfileSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  const data = parsed.data;

  await upsertFacilitatorProfile(user.id, {
    yearsFacilitating: data.yearsFacilitating,
    sessionsDelivered: data.sessionsDelivered,
    delegatesTrained: data.delegatesTrained,
    typicalAudienceSize: data.typicalAudienceSize,
    typicalAudienceSeniority: data.typicalAudienceSeniority,
    trainingFormats: data.trainingFormats,
    industriesServed: data.industriesServed,
    canTrainNow: data.canTrainNow,
    wantToTrain: data.wantToTrain,
    facilitatorGoals: data.facilitatorGoals,
  });

  if (data.skillRatings) {
    await setFacilitationSkillRatings(
      user.id,
      data.skillRatings.map((r) => ({
        skill: r.skill as FacilitationSkillName,
        proficiency: r.proficiency as ProficiencyLevel,
      }))
    );
  }

  await advanceStep(user.id, MEET_AWE_STEP);
  revalidatePath("/onboarding");
  redirect("/onboarding/meet-awe");
}

export async function updateOrganizationProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const membership = await getUserOrganizationMembership(user.id);
  if (!membership) {
    return { error: "You're not affiliated with an organization yet — add one from your profile first." };
  }

  const raw = {
    ...Object.fromEntries(formData),
    workforceLevels: formData.getAll("workforceLevels"),
    trainingNeeds: formData.getAll("trainingNeeds"),
    workforceChallenges: formData.getAll("workforceChallenges"),
    preferredSchedule: formData.getAll("preferredSchedule"),
    participationBarriers: formData.getAll("participationBarriers"),
  };
  const parsed = organizationProfileSchema.safeParse(raw);
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  const data = parsed.data;

  await upsertOrganizationProfile(membership.organizationId, data);

  await advanceStep(user.id, MEET_AWE_STEP);
  revalidatePath("/onboarding");
  redirect("/onboarding/meet-awe");
}

export async function completeOnboardingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = meetAweSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  const data = parsed.data;

  await upsertCareerProfile(user.id, { tellAweText: data.tellAweText });

  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingStep: MEET_AWE_STEP, onboardingCompletedAt: new Date() },
  });

  revalidatePath("/onboarding");
  redirect("/dashboard");
}

export async function skipOnboardingAction(): Promise<void> {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { onboardingSkippedAt: new Date() } });
  redirect("/dashboard");
}
