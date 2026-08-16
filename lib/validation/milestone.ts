import { z } from "zod";

export const addMilestoneSchema = z.object({
  eventId: z.string().min(1),
  title: z.string().trim().min(1, "Give this milestone a name.").max(200),
  amount: z.coerce.number().positive("Amount must be greater than zero."),
});
