import { z } from "zod";

// Mirrors the strength rule from the old Django SignupForm: min 8 chars, upper, lower, digit, symbol.
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[0-9]/, "Password must contain a number.")
  .regex(/[^A-Za-z0-9]/, "Password must contain a symbol.");

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    role: z.enum(["FACILITATOR", "EVENT_MANAGER", "PROFESSIONAL"]),
    firstName: z.string().trim().min(1, "First name is required."),
    lastName: z.string().trim().min(1, "Last name is required."),
    email: z.string().trim().toLowerCase().email("Enter a valid email address."),
    mobilePhone: z.string().trim().min(7, "Enter a valid phone number."),
    state: z.string().trim().optional().or(z.literal("")),
    localGovt: z.string().trim().optional().or(z.literal("")),
    address: z.string().trim().max(500, "Keep it under 500 characters.").optional().or(z.literal("")),
    organization: z.string().trim().optional().or(z.literal("")),
    bankCode: z.string().trim().optional().or(z.literal("")),
    accountNumber: z
      .string()
      .trim()
      .regex(/^\d{10}$/, "Account number must be 10 digits.")
      .optional()
      .or(z.literal("")),
    accountName: z.string().trim().optional().or(z.literal("")),
    affiliationType: z.enum(["independent", "organization"]).optional(),
    organizationId: z.string().trim().optional().or(z.literal("")),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((data) => data.role === "PROFESSIONAL" || !!data.bankCode, {
    message: "Select your bank.",
    path: ["bankCode"],
  })
  .refine((data) => data.role === "PROFESSIONAL" || !!data.accountNumber, {
    message: "Account number is required.",
    path: ["accountNumber"],
  })
  .refine((data) => data.role === "PROFESSIONAL" || !!data.accountName, {
    message: "Account name is required.",
    path: ["accountName"],
  })
  .refine((data) => data.affiliationType !== "organization" || !!data.organizationId, {
    message: "Select an organization.",
    path: ["organizationId"],
  });
export type SignupInput = z.infer<typeof signupSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
