import { z } from "zod";

// Comma-separated free-text tag inputs (memberships, certifications, skills-developed, etc)
// arrive as one string from a plain text input and are split/trimmed server-side — no
// client-side tag-input widget in this codebase yet, and these lists are short.
const tagList = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v.split(",").map((s) => s.trim()).filter(Boolean) : []));

// Blank optional inputs normalize to null (not "" or undefined) so they can be spread
// straight into a Prisma create/update: null both stores as NULL on create and correctly
// clears a previously-set value on edit (undefined would be silently ignored on update).
const optionalTrimmed = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

const optionalInt = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? Number.parseInt(v, 10) : null))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 0), "Enter a valid whole number.");

const optionalDate = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? new Date(v) : null))
  .refine((v) => v === null || !Number.isNaN(v.getTime()), "Enter a valid date.");

const requiredDate = z
  .string()
  .trim()
  .min(1, "Date is required.")
  .transform((v) => new Date(v))
  .refine((v) => !Number.isNaN(v.getTime()), "Enter a valid date.");

export const professionalProfileSchema = z.object({
  profileImageUrl: optionalTrimmed,
  currentRole: optionalTrimmed,
  currentEmployer: optionalTrimmed,
  industry: optionalTrimmed,
  yearsExperience: optionalInt,
  highestEducationLevel: optionalTrimmed,
  professionalMemberships: tagList,
  certifications: tagList,
  languagesSpoken: tagList,
  skillIds: z.array(z.string()).optional(),
});
export type ProfessionalProfileInput = z.infer<typeof professionalProfileSchema>;

export const employmentHistoryFormSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required."),
  jobTitle: z.string().trim().min(1, "Job title is required."),
  industry: optionalTrimmed,
  employmentType: z.enum([
    "FULL_TIME",
    "PART_TIME",
    "CONTRACT",
    "FREELANCE",
    "INTERNSHIP",
    "VOLUNTEER",
    "SELF_EMPLOYED",
  ]),
  location: optionalTrimmed,
  startDate: requiredDate,
  endDate: optionalDate,
  isCurrent: z.boolean(),
  responsibilities: optionalTrimmed,
  achievements: optionalTrimmed,
  skillsDeveloped: tagList,
  majorProjects: optionalTrimmed,
  teamSize: optionalInt,
  reasonForLeaving: optionalTrimmed,
});
export type EmploymentHistoryFormInput = z.infer<typeof employmentHistoryFormSchema>;

export const educationHistoryFormSchema = z.object({
  institution: z.string().trim().min(1, "Institution is required."),
  qualification: z.string().trim().min(1, "Qualification is required."),
  fieldOfStudy: optionalTrimmed,
  startDate: requiredDate,
  endDate: optionalDate,
  grade: optionalTrimmed,
  relevantCoursework: optionalTrimmed,
});
export type EducationHistoryFormInput = z.infer<typeof educationHistoryFormSchema>;

export const professionalDevelopmentFormSchema = z.object({
  type: z.enum(["COURSE", "TRAINING", "CERTIFICATION", "WORKSHOP", "CONFERENCE"]),
  title: z.string().trim().min(1, "Title is required."),
  provider: optionalTrimmed,
  dateCompleted: requiredDate,
  skillsAcquired: tagList,
  expiryDate: optionalDate,
});
export type ProfessionalDevelopmentFormInput = z.infer<typeof professionalDevelopmentFormSchema>;

export const careerDirectionSchema = z.object({
  targetRole: optionalTrimmed,
  targetIndustry: optionalTrimmed,
  targetCareerLevel: optionalTrimmed,
  targetTimeline: optionalTrimmed,
  longTermAmbition: optionalTrimmed,
  careerGoalTags: z.array(z.string()).optional(),
  topStrengths: tagList,
  skillsToImprove: tagList,
  weakSkills: tagList,
  skillsToAcquire: tagList,
  challengeTags: z.array(z.string()).optional(),
  challengeOther: optionalTrimmed,
});
export type CareerDirectionInput = z.infer<typeof careerDirectionSchema>;

export const learningPreferencesSchema = z.object({
  learningFormats: z.array(z.string()).optional(),
  availableLearningTime: optionalTrimmed,
  preferredSchedule: z.array(z.string()).optional(),
  preferredDelivery: optionalTrimmed,
  preferredLearningStyle: optionalTrimmed,
});
export type LearningPreferencesInput = z.infer<typeof learningPreferencesSchema>;

export const meetAweSchema = z.object({
  tellAweText: z
    .string()
    .trim()
    .max(4000, "Keep it under 4000 characters.")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : null)),
});
export type MeetAweInput = z.infer<typeof meetAweSchema>;
