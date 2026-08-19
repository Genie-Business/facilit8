"use server";

import { revalidatePath } from "next/cache";

import { createAdmin, updateAdminTier } from "@/lib/services/admin-management.service";
import { deactivateUser, reactivateUser } from "@/lib/services/user-status.service";
import { createAdminSchema } from "@/lib/validation/admin-management";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";
import { requireSuperAdmin } from "@/lib/auth/admin-guard";

export async function createAdminAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSuperAdmin();

  const parsed = createAdminSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const result = await createAdmin(parsed.data);
  if (!result.success) return { error: result.error };

  revalidatePath("/admin/admins");
  return { success: "Admin created. They can set their password via the Forgot Password flow." };
}

export async function updateAdminTierAction(userId: string, tier: "SUPER_ADMIN" | "SUPPORT_ADMIN"): Promise<void> {
  await requireSuperAdmin();
  const result = await updateAdminTier(userId, tier);
  if (!result.success) throw new Error(result.error);
  revalidatePath("/admin/admins");
}

export async function deactivateAdminAction(userId: string): Promise<void> {
  await requireSuperAdmin();
  await deactivateUser(userId);
  revalidatePath("/admin/admins");
}

export async function reactivateAdminAction(userId: string): Promise<void> {
  await requireSuperAdmin();
  await reactivateUser(userId);
  revalidatePath("/admin/admins");
}
