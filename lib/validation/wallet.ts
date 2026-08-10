import { z } from "zod";

export const withdrawFormSchema = z.object({
  amount: z.coerce.number().positive("Enter an amount greater than zero."),
  password: z.string().min(1, "Password is required."),
});

export type WithdrawFormInput = z.infer<typeof withdrawFormSchema>;
