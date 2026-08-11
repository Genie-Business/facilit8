"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { createFaq, deleteFaq } from "@/lib/services/faq.service";
import { upsertLegalPage } from "@/lib/services/legal-page.service";
import { updateSiteSettings } from "@/lib/services/site-settings.service";
import { faqFormSchema, legalPageFormSchema, siteSettingsFormSchema } from "@/lib/validation/content";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Not authorized.");
}

export async function createFaqAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = faqFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  await createFaq(parsed.data.question, parsed.data.answer);
  revalidatePath("/admin/content");
  revalidatePath("/faq");
  return { success: "FAQ added." };
}

export async function deleteFaqAction(id: string): Promise<void> {
  await requireAdmin();
  await deleteFaq(id);
  revalidatePath("/admin/content");
  revalidatePath("/faq");
}

export async function updateLegalPageAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = legalPageFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  await upsertLegalPage(parsed.data.slug, parsed.data.title, parsed.data.contentHtml);
  revalidatePath("/admin/content");
  revalidatePath(`/${parsed.data.slug}`);
  return { success: "Page updated." };
}

export async function updateSiteSettingsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = siteSettingsFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  await updateSiteSettings(parsed.data);
  revalidatePath("/admin/content");
  revalidatePath("/contact");
  return { success: "Site info updated." };
}
