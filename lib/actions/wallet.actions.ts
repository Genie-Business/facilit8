"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { withdrawFunds } from "@/lib/services/withdrawal.service";
import { withdrawFormSchema } from "@/lib/validation/wallet";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";

export async function withdrawAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const raw = Object.fromEntries(formData);
  const parsed = withdrawFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const result = await withdrawFunds(session.user.id, parsed.data);
  if (!result.success) return { error: result.error };

  revalidatePath("/wallet");
  revalidatePath("/wallet/transactions");
  return { success: "Withdrawal initiated." };
}
