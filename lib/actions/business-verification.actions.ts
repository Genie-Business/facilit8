"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import {
  submitBusinessVerification,
  uploadOrganizationDocument,
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

  const result = await submitBusinessVerification(organizationId, session.user.id, parsed.data);
  if (!result.success) return { error: result.error };

  revalidatePath("/organization/verify");
  return { success: "Business verification started. We'll notify you as it progresses." };
}

export async function uploadOrganizationDocumentAction(
  organizationId: string,
  anchorDocumentId: string,
  formData: FormData
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a file first." };
  }

  const result = await uploadOrganizationDocument(organizationId, session.user.id, anchorDocumentId, file);
  revalidatePath("/organization/verify");
  return result.success ? {} : { error: result.error };
}
