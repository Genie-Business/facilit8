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
import {
  professionalProfileSchema,
  employmentHistoryFormSchema,
  educationHistoryFormSchema,
  professionalDevelopmentFormSchema,
  careerDirectionSchema,
  learningPreferencesSchema,
  meetAweSchema,
} from "@/lib/validation/onboarding";

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
  revalidatePath("/onboarding/background");
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
  revalidatePath("/onboarding/background");
  return { success: "Employment record updated." };
}

export async function deleteEmploymentHistoryAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteEmploymentHistory(id, user.id);
  revalidatePath("/onboarding/background");
}

export async function addEducationHistoryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = educationHistoryFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };

  await createEducationHistory(user.id, parsed.data);
  revalidatePath("/onboarding/background");
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
  revalidatePath("/onboarding/background");
  return { success: "Education record updated." };
}

export async function deleteEducationHistoryAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteEducationHistory(id, user.id);
  revalidatePath("/onboarding/background");
}

export async function addProfessionalDevelopmentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = professionalDevelopmentFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };

  await createProfessionalDevelopment(user.id, parsed.data);
  revalidatePath("/onboarding/background");
  return { success: "Record added." };
}

export async function deleteProfessionalDevelopmentAction(id: string): Promise<void> {
  const user = await requireUser();
  await deleteProfessionalDevelopment(id, user.id);
  revalidatePath("/onboarding/background");
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

  await advanceStep(user.id, 4);
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
    data: { onboardingStep: 5, onboardingCompletedAt: new Date() },
  });

  revalidatePath("/onboarding");
  redirect("/dashboard");
}

export async function skipOnboardingAction(): Promise<void> {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { onboardingSkippedAt: new Date() } });
  redirect("/dashboard");
}
