import { unstable_cache } from "next/cache";

import { listBanks } from "@/lib/paystack/api";
import { isPaystackConfigured } from "@/lib/paystack/client";
import { NIGERIAN_BANKS } from "@/lib/paystack/static-bank-list";
import { BANK_LIST_UNAVAILABLE, BANK_NOT_RECOGNISED } from "@/lib/bank-messages";

export interface BankOption {
  code: string;
  name: string;
}

/** Paystack's live bank list, with one retry. Throws if it can't produce a non-empty list. */
async function fetchLiveBanks(): Promise<BankOption[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const banks = await listBanks();
      if (banks.length > 0) return banks;
      lastError = new Error("Paystack returned an empty bank list.");
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * Only a SUCCESSFUL fetch is ever cached: a throw is not stored by unstable_cache, so one failed call
 * can't pin a bad list for a day. (The Anchor-era version of this caught the failure inside the cached
 * function and returned a static list, which then WAS cached, and every bank selection failed until
 * the entry expired.) The key is new because the old entry survives deployments.
 */
const cachedLiveBanks = unstable_cache(fetchLiveBanks, ["paystack-bank-list"], { revalidate: 60 * 60 * 24 });

// Per-instance memory of the last good list, so a blip after a successful load serves that
// list instead of an error. Not a substitute for the cache — serverless instances are short-lived.
let lastKnownGood: BankOption[] | null = null;

/**
 * The banks a user can pick from. When Paystack can't be reached this is EMPTY wherever Paystack is
 * configured — an honest "unavailable" beats a possibly stale hard-coded list. The static list is
 * only for local development with no Paystack key at all.
 */
export async function getBankOptions(): Promise<BankOption[]> {
  try {
    const banks = await cachedLiveBanks();
    lastKnownGood = banks;
    return banks;
  } catch (err) {
    console.error("Failed to fetch the live bank list from Paystack:", err);
    if (lastKnownGood) return lastKnownGood;
    return isPaystackConfigured() ? [] : NIGERIAN_BANKS;
  }
}

export type BankLookup = { ok: true; bank: BankOption } | { ok: false; error: string };

/**
 * Checks a submitted bank code against the current list before anything is sent to Paystack, so a
 * stale page (rendered with an old list) or a tampered value gets a clear message instead of a
 * provider error — and instead of being saved on the user and failing later.
 */
export async function lookupBank(code: string): Promise<BankLookup> {
  const banks = await getBankOptions();
  const bank = banks.find((candidate) => candidate.code === code);
  if (bank) return { ok: true, bank };
  return { ok: false, error: banks.length === 0 ? BANK_LIST_UNAVAILABLE : BANK_NOT_RECOGNISED };
}
