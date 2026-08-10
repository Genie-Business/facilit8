"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { updateAwePricing } from "@/lib/services/awe-pricing.service";
import { awePricingFormSchema } from "@/lib/validation/awe-pricing";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Not authorized.");
}

export async function updateAwePricingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const parsed = awePricingFormSchema.safeParse({
    ...Object.fromEntries(formData),
    isFree: formData.get("isFree") === "on",
  });
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  await updateAwePricing({ ...parsed.data, isFree: parsed.data.isFree ?? false });
  revalidatePath("/admin/awe-pricing");
  revalidatePath("/awe");
  revalidatePath("/awe/subscribe");
  return { success: "Awe pricing updated." };
}
