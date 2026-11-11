import { getUserBalance } from "@/lib/ledger/ledger.service";

/**
 * A user's spendable balance, from the ledger — the source of truth for everything in the app.
 * Paystack only holds the pooled money; it has no idea whose share is whose. Someone with no
 * wallet yet simply has ₦0.
 */
export async function getWalletBalance(userId: string): Promise<number> {
  return getUserBalance(userId);
}
