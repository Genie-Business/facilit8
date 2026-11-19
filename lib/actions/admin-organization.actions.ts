"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/admin-guard";
import { approveOrganization, rejectOrganization, rejectOrganizationDocument } from "@/lib/services/business-verification.service";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";

const reasonSchema = z.object({
  reason: z.string().trim().min(1, "Say why, so they know what to fix.").max(500, "Keep it under 500 characters."),
});

export async function approveOrganizationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !organizationId) return { error: "Missing organization." };

  const result = await approveOrganization(organizationId, session.user.id);
  if (!result.success) return { error: result.error };

  revalidatePath("/admin/organizations");
  return { success: "Organization verified." };
}

export async function rejectOrganizationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !organizationId) return { error: "Missing organization." };

  const parsed = reasonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };

  const result = await rejectOrganization(organizationId, session.user.id, parsed.data.reason);
  if (!result.success) return { error: result.error };

  revalidatePath("/admin/organizations");
  return { success: "Organization rejected. The owner has been told why." };
}

export async function rejectOrganizationDocumentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await requireAdmin();
  const documentId = formData.get("documentId");
  if (typeof documentId !== "string" || !documentId) return { error: "Missing document." };

  const parsed = reasonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };

  const result = await rejectOrganizationDocument(documentId, session.user.id, parsed.data.reason);
  if (!result.success) return { error: result.error };

  revalidatePath("/admin/organizations");
  return { success: "Document sent back. The owner has been told why." };
}
