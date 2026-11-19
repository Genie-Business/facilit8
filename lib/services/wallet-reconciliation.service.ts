import { prisma } from "@/lib/db";
import { getUserBalance } from "@/lib/ledger/ledger.service";
import { provisionWallet } from "@/lib/services/wallet-provisioning.service";

interface ReconciliationResult {
  success: boolean;
  error?: string;
}

/** Looks up any account's current wallet-setup state by email, for the admin lookup tool —
 * separate from listUsersNeedingRecovery, which only catches outright-failed provisioning. */
export async function findUserWalletState(email: string) {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      kycVerified: true,
      kycFailedReason: true,
      paystackCustomerCode: true,
      paystackRecipientCode: true,
      depositAccountId: true,
      vaAccountNumber: true,
      vaBankName: true,
      vaCreationFailed: true,
      vaFailureReason: true,
      linkedBankName: true,
      linkedAccountNumber: true,
    },
  });
  if (!user) return null;
  return { ...user, balance: await getUserBalance(user.id) };
}

/**
 * Re-runs the setup that signup runs (Paystack customer, then the withdrawal recipient) for one
 * user. Each step skips itself if already done, so this is safe to press at any time. It can't
 * create the wallet itself: that only happens when Paystack verifies the user's BVN.
 */
export async function resyncWallet(userId: string): Promise<ReconciliationResult> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) return { success: false, error: "User not found." };

  await provisionWallet(userId);

  const after = await prisma.user.findUnique({
    where: { id: userId },
    select: { vaCreationFailed: true, vaFailureReason: true },
  });
  if (after?.vaCreationFailed) {
    return { success: false, error: after.vaFailureReason ?? "Setup is still failing — see the last failure above." };
  }
  return { success: true };
}
