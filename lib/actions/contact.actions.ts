"use server";

import { prisma } from "@/lib/db";
import { contactFormSchema } from "@/lib/validation/contact";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";
import { isRateLimited, RATE_LIMITS, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export async function submitContactAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (await isRateLimited("contact", RATE_LIMITS.contact.limit, RATE_LIMITS.contact.windowMs)) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const parsed = contactFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  await prisma.contact.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message: parsed.data.message,
    },
  });

  return { success: "Thanks for reaching out, we'll get back to you soon." };
}

export async function submitNewsletterAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (await isRateLimited("newsletter", RATE_LIMITS.newsletter.limit, RATE_LIMITS.newsletter.windowMs)) {
    return { error: RATE_LIMIT_MESSAGE };
  }

  const email = formData.get("email");
  if (typeof email !== "string" || !email.includes("@")) {
    return { error: "Enter a valid email address." };
  }

  await prisma.newsletter.upsert({
    where: { email: email.trim().toLowerCase() },
    create: { email: email.trim().toLowerCase() },
    update: {},
  });

  return { success: "Subscribed! Thanks for joining." };
}
