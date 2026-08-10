import { unstable_cache } from "next/cache";

import { listBanks } from "@/lib/anchor/customers";
import { NIGERIAN_BANKS } from "@/lib/anchor/bank-list";

/**
 * Anchor uses its own proprietary bank codes, not standard NIP/CBN codes (confirmed live —
 * e.g. Access Bank is "000014" in Anchor's scheme, not the NIP code "044"). The static
 * NIGERIAN_BANKS list is NIP-coded and will be rejected by Anchor's counterparty creation,
 * so it's a fallback only, used when the live call fails (e.g. no credentials in local dev).
 * Cached for a day since Anchor's bank list is effectively static reference data.
 */
export const getBankOptions = unstable_cache(
  async () => {
    try {
      const banks = await listBanks();
      return banks.length > 0 ? banks : NIGERIAN_BANKS;
    } catch (err) {
      console.error("Failed to fetch live bank list from Anchor, falling back to the static list:", err);
      return NIGERIAN_BANKS;
    }
  },
  ["anchor-bank-list"],
  { revalidate: 60 * 60 * 24 }
);
