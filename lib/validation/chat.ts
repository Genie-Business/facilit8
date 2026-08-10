import { z } from "zod";

export const messageFormSchema = z.object({
  content: z.string().trim().min(1, "Message can't be empty.").max(2000, "Message is too long."),
});

export type MessageFormInput = z.infer<typeof messageFormSchema>;
