import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z.string().trim().optional().or(z.literal("")),
  message: z.string().trim().min(10, "Tell us a bit more (at least 10 characters)."),
});
