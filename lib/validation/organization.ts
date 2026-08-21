import { z } from "zod";

import { passwordSchema } from "@/lib/validation/auth";

export const sendOrgInviteSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  role: z.enum(["MANAGER", "MEMBER"]),
});
export type SendOrgInviteInput = z.infer<typeof sendOrgInviteSchema>;

// Only asked when the invitee doesn't already have an account — same shape as the relevant
// slice of signupSchema (name/phone/password), email comes from the invite itself, not the
// form, so it can't be tampered with.
export const redeemOrgInviteNewAccountSchema = z.object({
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  mobilePhone: z.string().trim().min(7, "Enter a valid phone number."),
  password: passwordSchema,
});
export type RedeemOrgInviteNewAccountInput = z.infer<typeof redeemOrgInviteNewAccountSchema>;
