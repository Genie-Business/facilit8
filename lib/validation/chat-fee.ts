import { z } from "zod";

// Whole naira, with a ceiling as a typo guard (₦5,000 → ₦50,000,000 is one stray keystroke).
export const CHAT_FEE_MAX = 1_000_000;

export const chatFeeFormSchema = z.object({
  amount: z.coerce
    .number()
    .int("Enter a whole number of naira.")
    .min(1, "The fee must be at least ₦1.")
    .max(CHAT_FEE_MAX, `The fee can't exceed ₦${CHAT_FEE_MAX.toLocaleString("en-NG")}.`),
});
