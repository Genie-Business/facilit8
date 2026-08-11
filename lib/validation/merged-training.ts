import { z } from "zod";

export const mergedTrainingFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    description: z.string().trim().optional().or(z.literal("")),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    location: z.string().trim().min(1, "Location is required."),
    delegatesLevel: z.string().trim().min(1, "Delegates level is required."),
    eventCategory: z.string().trim().min(1, "Event category is required."),
    venueType: z.string().trim().min(1, "Venue type is required."),
    totalSlots: z.coerce.number().int().positive("Total slots must be a positive number."),
    pricePerDelegate: z.coerce.number().positive("Price per delegate must be a positive number."),
    deadline: z.string().min(1, "Funding deadline is required."),
    isInviteOnly: z.coerce.boolean().optional(),
    // Optional — a Facilitator proposing a session isn't funding a delegate share
    // themselves, so this only applies to Event Manager / Professional initiators.
    initiatorNumDelegates: z.coerce.number().int().positive("Enter how many delegates you're bringing.").optional(),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  })
  .refine((data) => new Date(data.deadline) <= new Date(data.startDate), {
    message: "The funding deadline must be before the event starts.",
    path: ["deadline"],
  })
  .refine((data) => data.initiatorNumDelegates === undefined || data.initiatorNumDelegates <= data.totalSlots, {
    message: "Your delegate count can't exceed the total slots.",
    path: ["initiatorNumDelegates"],
  });

export type MergedTrainingFormInput = z.infer<typeof mergedTrainingFormSchema>;

export const joinMergedTrainingFormSchema = z.object({
  numDelegates: z.coerce.number().int().positive("Enter how many delegates you're bringing."),
});

export const mergerApplicationFormSchema = z.object({
  courseBreakdown: z.string().trim().optional().or(z.literal("")),
  objective: z.string().trim().optional().or(z.literal("")),
  classActivities: z.string().trim().optional().or(z.literal("")),
  budgetPerDelegate: z.coerce.number().positive("Budget per delegate must be a positive number."),
});
