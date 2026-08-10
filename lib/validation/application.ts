import { z } from "zod";

export const applicationFormSchema = z.object({
  courseBreakdown: z.string().trim().optional().or(z.literal("")),
  objective: z.string().trim().optional().or(z.literal("")),
  classActivities: z.string().trim().optional().or(z.literal("")),
  budgetPerDelegate: z.coerce.number().positive("Budget per delegate must be a positive number."),
});

export type ApplicationFormInput = z.infer<typeof applicationFormSchema>;
