import { z } from "zod";

// A ceiling on a percentage fee, in whole naira. The upper bound is a typo guard, not a business
// rule: ₦500 → ₦50,000,000 is one stray keystroke.
export const FEE_CAP_MAX = 1_000_000;

export const platformFeeFormSchema = z.object({
  scope: z.enum(["FACILITATOR_PAYOUT", "MERGED_TRAINING_PAYOUT", "WITHDRAWAL"]),
  percentage: z.coerce.number().min(0, "Must be 0 or greater.").max(100, "Can't exceed 100%."),
  // Optional: a blank field means "no cap".
  maxAmount: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce
      .number()
      .int("Enter a whole number of naira.")
      .min(1, "The maximum fee must be at least ₦1.")
      .max(FEE_CAP_MAX, `The maximum fee can't exceed ₦${FEE_CAP_MAX.toLocaleString("en-NG")}.`)
      .optional()
  ),
});
