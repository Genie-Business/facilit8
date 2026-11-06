import { z } from "zod";

export const platformFeeFormSchema = z.object({
  scope: z.enum(["FACILITATOR_PAYOUT", "MERGED_TRAINING_PAYOUT", "WITHDRAWAL"]),
  percentage: z.coerce.number().min(0, "Must be 0 or greater.").max(100, "Can't exceed 100%."),
});
