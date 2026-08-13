"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { withdrawFunds } from "@/lib/services/withdrawal.service";
import { updateLinkedBankAccount } from "@/lib/services/anchor-provisioning.service";
import { getBankOptions } from "@/lib/services/bank-list.service";
import { withdrawFormSchema, linkBankAccountSchema } from "@/lib/validation/wallet";
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

export async function updateLinkedBankAccountAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session) return { error: "Not authenticated." };

  const parsed = linkBankAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const banks = await getBankOptions();
  const bankName = banks.find((bank) => bank.code === parsed.data.bankCode)?.name ?? parsed.data.bankCode;

  const result = await updateLinkedBankAccount(session.user.id, { ...parsed.data, bankName });
  if (!result.success) return { error: result.error };

  revalidatePath("/wallet/withdraw");
  revalidatePath("/wallet");
  return { success: "Withdrawal account updated." };
}
