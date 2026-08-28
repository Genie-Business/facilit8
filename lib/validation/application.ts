import { z } from "zod";

export const applicationFormSchema = z.object({
  classActivities: z.string().trim().min(1, "Describe the activities you'll run."),
  objective: z.string().trim().min(1, "Describe the expected outcomes."),
  courseBreakdown: z.string().trim().optional().or(z.literal("")),
});

export type ApplicationFormInput = z.infer<typeof applicationFormSchema>;
