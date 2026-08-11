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
