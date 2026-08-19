import { z } from "zod";

export const createAdminSchema = z.object({
  email: z.string().trim().email("Enter a valid email."),
  firstName: z.string().trim().min(1, "First name is required."),
  lastName: z.string().trim().min(1, "Last name is required."),
  tier: z.enum(["SUPER_ADMIN", "SUPPORT_ADMIN"]),
});
