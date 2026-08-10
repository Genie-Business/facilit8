import { prisma } from "@/lib/db";
import { getAccountBalance } from "@/lib/anchor/accounts";

/**
 * Live Anchor balance is the source of truth for spendable funds; local Transaction rows
 * are the audit trail. Fixes Django's `User.wallet_balance`, which referenced a relation
 * that never existed in that codebase.
 */
export async function getWalletBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { depositAccountId: true } });
  if (!user?.depositAccountId) return 0;
  return getAccountBalance(user.depositAccountId);
}
