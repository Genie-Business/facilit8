import { z } from "zod";

export const raiseDisputeSchema = z.object({
  targetType: z.enum(["TRAINING_EVENT", "MERGED_TRAINING_EVENT"]),
  targetId: z.string().min(1),
  reason: z.string().trim().min(10, "Please describe the issue in a bit more detail.").max(2000),
});

export const resolveDisputeSchema = z.object({
  disputeId: z.string().min(1),
  status: z.enum(["RESOLVED_REFUNDED", "RESOLVED_NO_ACTION"]),
  resolutionNotes: z.string().trim().min(1, "Add a note explaining the resolution.").max(2000),
});
