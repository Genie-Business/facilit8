import { z } from "zod";

export const deactivateAccountSchema = z.object({
  password: z.string().min(1, "Password is required."),
});
