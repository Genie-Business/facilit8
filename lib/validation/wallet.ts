import { z } from "zod";

export const withdrawFormSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount greater than zero."),
  password: z.string().min(1, "Password is required."),
});

export type WithdrawFormInput = z.infer<typeof withdrawFormSchema>;

export const linkBankAccountSchema = z.object({
  bankCode: z.string().trim().min(1, "Select your bank."),
  accountNumber: z.string().trim().regex(/^\d{10}$/, "Account number must be 10 digits."),
  accountName: z.string().trim().min(1, "Account name is required."),
});

export type LinkBankAccountInput = z.infer<typeof linkBankAccountSchema>;
