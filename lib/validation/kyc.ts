import { z } from "zod";

export const kycFormSchema = z.object({
  bvn: z.string().trim().regex(/^\d{11}$/, "BVN must be exactly 11 digits."),
  dateOfBirth: z
    .string()
    .min(1, "Date of birth is required.")
    .refine((v) => new Date(v) < new Date(), "Date of birth must be in the past."),
  gender: z.enum(["MALE", "FEMALE"]),
});

export type KycFormInput = z.infer<typeof kycFormSchema>;
