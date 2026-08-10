import { z } from "zod";

export const reviewFormSchema = z.object({
  trainingEventId: z.string().min(1, "Select the training event this review is for."),
  rating: z.coerce.number().int().min(1).max(5),
  feedback: z.string().trim().optional().or(z.literal("")),
});

export type ReviewFormInput = z.infer<typeof reviewFormSchema>;
