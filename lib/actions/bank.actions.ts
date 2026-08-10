"use server";

import { resolveAccountName } from "@/lib/anchor/accounts";
import { isRateLimited } from "@/lib/rate-limit";

export interface ResolveAccountNameResult {
  accountName: string | null;
  error?: string;
}

export async function resolveAccountNameAction(
  bankCode: string,
  accountNumber: string
): Promise<ResolveAccountNameResult> {
  if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
    return { accountName: null };
  }

  if (await isRateLimited("resolve-account", 20, 60 * 1000)) {
    return { accountName: null, error: "Too many attempts. Please wait a moment and try again." };
  }

  const accountName = await resolveAccountName(bankCode, accountNumber);
  if (!accountName) {
    return { accountName: null, error: "Couldn't verify this account. Enter the account name manually." };
  }

  return { accountName };
}
