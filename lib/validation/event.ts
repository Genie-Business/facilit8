import { z } from "zod";

export const eventFormSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required."),
    startDate: z.string().min(1, "Start date is required."),
    endDate: z.string().min(1, "End date is required."),
    location: z.string().trim().min(1, "Location is required."),
    capacity: z.coerce.number().int().positive("Capacity must be a positive number."),
    skillType: z.string().trim().min(1, "Skill type is required."),
    expectedTrainingSkills: z.string().trim().optional().or(z.literal("")),
    eventObjective: z.string().trim().optional().or(z.literal("")),
    delegatesLevel: z.string().trim().min(1, "Delegates level is required."),
    eventCategory: z.string().trim().min(1, "Event category is required."),
    venueType: z.string().trim().min(1, "Venue type is required."),
    seriesLength: z.coerce.number().int().positive().optional().or(z.literal("")),
    eventExpiryDate: z.string().min(1, "Application deadline is required."),
    eventDetails: z.string().trim().optional().or(z.literal("")),
    trainingMaterials: z.coerce.boolean().optional(),
    trainingBudget: z.coerce.number().positive("Budget must be a positive number."),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  })
  .refine((data) => new Date(data.eventExpiryDate) <= new Date(data.startDate), {
    message: "The application deadline must be before the event starts.",
    path: ["eventExpiryDate"],
  });

export type EventFormInput = z.infer<typeof eventFormSchema>;
