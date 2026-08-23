"use server";

import { revalidatePath } from "next/cache";

import { setPlatformFee, deactivatePlatformFee } from "@/lib/services/platform-fee.service";
import { platformFeeFormSchema } from "@/lib/validation/platform-fee";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";
import { requireSuperAdmin } from "@/lib/auth/admin-guard";
import type { PlatformFeeScope } from "@/lib/generated/prisma/client";

export async function setPlatformFeeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireSuperAdmin();

  const parsed = platformFeeFormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  await setPlatformFee(parsed.data.scope, parsed.data.percentage);
  revalidatePath("/admin/fees");
  return { success: `Fee updated to ${parsed.data.percentage}%.` };
}

export async function deactivatePlatformFeeAction(scope: PlatformFeeScope): Promise<void> {
  await requireSuperAdmin();
  await deactivatePlatformFee(scope);
  revalidatePath("/admin/fees");
}
