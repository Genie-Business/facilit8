import { unstable_cache } from "next/cache";

import { listBanks } from "@/lib/anchor/customers";
import { NIGERIAN_BANKS } from "@/lib/anchor/bank-list";
import { BANK_LIST_UNAVAILABLE, BANK_NOT_RECOGNISED } from "@/lib/bank-messages";

export interface BankOption {
  code: string;
  name: string;
}

function anchorIsConfigured(): boolean {
  return !!process.env.ANCHOR_SECRET_KEY && !!process.env.ANCHOR_BASE_URL;
}

/** Anchor's live list, with one retry. Throws if it can't produce a non-empty list. */
async function fetchLiveBanks(): Promise<BankOption[]> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const banks = await listBanks();
      if (banks.length > 0) return banks;
      lastError = new Error("Anchor returned an empty bank list.");
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

/**
 * Anchor uses its own bank codes (6-digit NIP codes, e.g. Access Bank is "000014"), not the
 * 3-digit CBN codes in the static NIGERIAN_BANKS list, and rejects those with "Invalid Bank Code".
 *
 * So only a SUCCESSFUL fetch is ever cached: a throw is not stored by unstable_cache, so one
 * failed call can't pin a bad list for a day. The previous version caught the failure inside the
 * cached function and returned the static list, which then WAS cached — production served 3-digit
 * codes to every signup, wallet setup and recovery until the entry expired. The cache key is
 * versioned (-v2) because that poisoned entry is persisted across deployments and would otherwise
 * keep being read.
 */
const cachedLiveBanks = unstable_cache(fetchLiveBanks, ["anchor-bank-list-v2"], { revalidate: 60 * 60 * 24 });

// Per-instance memory of the last good list, so a blip after a successful load serves that
// list instead of an error. Not a substitute for the cache — serverless instances are short-lived.
let lastKnownGood: BankOption[] | null = null;

/**
 * The banks a user can pick from. When Anchor can't be reached this is EMPTY in any environment
 * where Anchor is configured — an honest "unavailable" beats a list whose every code Anchor will
 * reject. The static list is only for local development with no Anchor credentials at all.
 */
export async function getBankOptions(): Promise<BankOption[]> {
  try {
    const banks = await cachedLiveBanks();
    lastKnownGood = banks;
    return banks;
  } catch (err) {
    console.error("Failed to fetch the live bank list from Anchor:", err);
    if (lastKnownGood) return lastKnownGood;
    return anchorIsConfigured() ? [] : NIGERIAN_BANKS;
  }
}

export type BankLookup = { ok: true; bank: BankOption } | { ok: false; error: string };

/**
 * Checks a submitted bank code against the current list before anything is sent to Anchor, so a
 * stale page (rendered with an old list) or a tampered value gets a clear message instead of
 * Anchor's "Invalid Bank Code" — and instead of being saved on the user and failing later.
 */
export async function lookupBank(code: string): Promise<BankLookup> {
  const banks = await getBankOptions();
  const bank = banks.find((candidate) => candidate.code === code);
  if (bank) return { ok: true, bank };
  return { ok: false, error: banks.length === 0 ? BANK_LIST_UNAVAILABLE : BANK_NOT_RECOGNISED };
}
