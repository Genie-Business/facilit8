import { z } from "zod";

export const awePricingFormSchema = z.object({
  monthlyPrice: z.coerce.number().positive("Price must be a positive number."),
  durationDays: z.coerce.number().int().positive("Duration must be a positive number of days."),
  isFree: z.coerce.boolean().optional(),
});

export type AwePricingFormInput = z.infer<typeof awePricingFormSchema>;
