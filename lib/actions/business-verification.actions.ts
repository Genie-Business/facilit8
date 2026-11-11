"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  attachOrganizationDocument,
  OrganizationAccessError,
  submitBusinessVerification,
} from "@/lib/services/business-verification.service";
import { businessVerificationSchema } from "@/lib/validation/business";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";

export async function submitBusinessVerificationAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const organizationId = formData.get("organizationId");
  if (typeof organizationId !== "string" || !organizationId) {
    return { error: "Missing organization." };
  }

  const parsed = businessVerificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  try {
    const result = await submitBusinessVerification(organizationId, session.user.id, parsed.data);
    if (!result.success) return { error: result.error };
  } catch (err) {
    if (err instanceof OrganizationAccessError) return { error: err.message };
    console.error("Business verification submission failed:", err);
    return { error: "Couldn't save your details. Please try again." };
  }

  revalidatePath("/organization/verify");
  return { success: "Details saved. Upload the documents below and we'll review your organization." };
}

/**
 * The browser uploads the file straight to storage, then tells us where it ended up; this only
 * records that address against the document (after checking it is one of our own).
 */
export async function attachOrganizationDocumentAction(
  organizationId: string,
  documentId: string,
  fileUrl: string
): Promise<{ error?: string; sentForReview?: boolean }> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  try {
    const result = await attachOrganizationDocument(organizationId, session.user.id, documentId, fileUrl);
    revalidatePath("/organization/verify");
    return result.success ? { sentForReview: result.sentForReview } : { error: result.error };
  } catch (err) {
    if (err instanceof OrganizationAccessError) return { error: err.message };
    console.error("Attaching an organization document failed:", err);
    return { error: "Couldn't save the document. Please try again." };
  }
}
