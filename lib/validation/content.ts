import { z } from "zod";

export const faqFormSchema = z.object({
  question: z.string().trim().min(1, "Enter a question."),
  answer: z.string().trim().min(1, "Enter an answer."),
});

export const legalPageFormSchema = z.object({
  slug: z.enum(["privacy", "terms"]),
  title: z.string().trim().min(1, "Enter a title."),
  contentHtml: z.string().trim().min(1, "Content can't be empty."),
});

export const siteSettingsFormSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  address: z.string().trim().optional(),
});

export type FaqFormInput = z.infer<typeof faqFormSchema>;
export type LegalPageFormInput = z.infer<typeof legalPageFormSchema>;
export type SiteSettingsFormInput = z.infer<typeof siteSettingsFormSchema>;

// ---------- Marketing page content ----------
// Each page's `blocks` shape mirrors its current hardcoded JSX structure exactly, not a
// generic block-builder. The admin form serializes the whole edited object into one hidden
// JSON field (`marketingPageContentFormSchema.blocks`); the per-page schemas below validate
// that parsed JSON, not raw FormData fields.

const heroSchema = z.object({
  eyebrow: z.string().trim().min(1, "Required"),
  title: z.string().trim().min(1, "Required"),
  description: z.string().trim().optional().default(""),
});

const cardSchema = z.object({
  icon: z.string().trim().min(1),
  title: z.string().trim().min(1, "Required"),
  body: z.string().trim().min(1, "Required"),
});

const stepSchema = z.object({
  title: z.string().trim().min(1, "Required"),
  body: z.string().trim().min(1, "Required"),
});

export const aboutContentSchema = z.object({
  hero: heroSchema,
  missionHeading: z.string().trim().min(1),
  missionLead: z.string().trim().min(1),
  missionBody: z.string().trim().min(1),
  values: z.array(cardSchema).min(1),
});

export const servicesContentSchema = z.object({
  hero: heroSchema,
  eventManagerSteps: z.array(stepSchema).min(1),
  facilitatorSteps: z.array(stepSchema).min(1),
  professionalSteps: z.array(stepSchema).min(1),
  platformFeatures: z.array(cardSchema).min(1),
  mergedTrainingCallout: stepSchema,
  aweCallout: stepSchema,
});

export const careersContentSchema = z.object({
  hero: heroSchema,
  body: z.string().trim().min(1),
});

export const homeContentSchema = z.object({
  hero: z.object({
    badge: z.string().trim().min(1),
    headlineBefore: z.string().trim().min(1),
    headlineHighlight: z.string().trim().min(1),
    subhead: z.string().trim().min(1),
  }),
  audiencesEyebrow: z.string().trim().min(1),
  audiencesTitle: z.string().trim().min(1),
  audiences: z.array(cardSchema.extend({ eyebrow: z.string().trim().min(1) })).min(1),
  servicesEyebrow: z.string().trim().min(1),
  servicesTitle: z.string().trim().min(1),
  services: z.array(cardSchema).min(1),
  missionEyebrow: z.string().trim().min(1),
  missionTitle: z.string().trim().min(1),
  missionBody: z.string().trim().min(1),
  awe: z.object({
    badge: z.string().trim().min(1),
    title: z.string().trim().min(1),
    body: z.string().trim().min(1),
    bullets: z.array(z.string().trim().min(1)).min(1),
  }),
});

export const MARKETING_PAGE_SCHEMAS = {
  home: homeContentSchema,
  about: aboutContentSchema,
  services: servicesContentSchema,
  careers: careersContentSchema,
} as const;

export type MarketingPage = keyof typeof MARKETING_PAGE_SCHEMAS;

export const marketingPageContentFormSchema = z.object({
  page: z.enum(["home", "about", "services", "careers"]),
  blocks: z.string().min(1, "Content can't be empty."),
});

export type AboutContent = z.infer<typeof aboutContentSchema>;
export type ServicesContent = z.infer<typeof servicesContentSchema>;
export type CareersContent = z.infer<typeof careersContentSchema>;
export type HomeContent = z.infer<typeof homeContentSchema>;
