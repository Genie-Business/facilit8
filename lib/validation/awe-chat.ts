import { z } from "zod";

export const aweMessageFormSchema = z.object({
  content: z.string().trim().min(1, "Message can't be empty.").max(4000, "Message is too long."),
  conversationId: z.string().trim().optional().or(z.literal("")),
});

export type AweMessageFormInput = z.infer<typeof aweMessageFormSchema>;
