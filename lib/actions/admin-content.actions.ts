"use server";

import { revalidatePath } from "next/cache";

import { createFaq, deleteFaq } from "@/lib/services/faq.service";
import { upsertLegalPage } from "@/lib/services/legal-page.service";
import { updateSiteSettings } from "@/lib/services/site-settings.service";
import { updateMarketingPageContent } from "@/lib/services/marketing-content.service";
import {
  faqFormSchema,
  legalPageFormSchema,
  siteSettingsFormSchema,
  marketingPageContentFormSchema,
  MARKETING_PAGE_SCHEMAS,
} from "@/lib/validation/content";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";
import { requireAdmin } from "@/lib/auth/admin-guard";

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

const PAGE_PATH: Record<string, string> = { home: "/", about: "/about", services: "/services", careers: "/careers" };

export async function updateMarketingPageContentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();

  const parsed = marketingPageContentFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  let blocks: unknown;
  try {
    blocks = JSON.parse(parsed.data.blocks);
  } catch {
    return { error: "Something went wrong building that page's content. Please try again." };
  }

  const pageParsed = MARKETING_PAGE_SCHEMAS[parsed.data.page].safeParse(blocks);
  if (!pageParsed.success) {
    return { error: "Every field is required — check for any blank titles or descriptions." };
  }

  await updateMarketingPageContent(parsed.data.page, pageParsed.data);
  revalidatePath("/admin/content");
  revalidatePath(PAGE_PATH[parsed.data.page]);
  return { success: "Page updated." };
}
