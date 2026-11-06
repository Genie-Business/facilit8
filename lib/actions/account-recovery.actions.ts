"use server";

import { redeemAccountRecoveryToken } from "@/lib/services/account-recovery.service";
import { lookupBank } from "@/lib/services/bank-list.service";
import { linkBankAccountSchema } from "@/lib/validation/wallet";
import { ActionState, firstFieldErrors } from "@/lib/actions/shared";

export async function redeemAccountRecoveryAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = formData.get("token");
  if (typeof token !== "string" || !token) {
    return { error: "Invalid or missing recovery link." };
  }

  const parsed = linkBankAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: firstFieldErrors(parsed.error.flatten().fieldErrors) };
  }

  const bank = await lookupBank(parsed.data.bankCode);
  if (!bank.ok) return { fieldErrors: { bankCode: bank.error } };

  const result = await redeemAccountRecoveryToken(token, { ...parsed.data, bankName: bank.bank.name });
  if (!result.success) return { error: result.error };

  return { success: "Your wallet is set up. You can now sign in and use it normally." };
}
