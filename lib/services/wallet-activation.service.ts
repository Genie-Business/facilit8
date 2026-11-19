import { prisma } from "@/lib/db";
import { ensureUserWallet, inLedgerTransaction } from "@/lib/ledger/ledger.service";
import { createNotification } from "@/lib/services/notification.service";

export interface WalletAccountDetails {
  accountNumber: string;
  accountName: string | null;
  bankName: string | null;
}

/** How a Paystack event names the person it's about: their customer code, or failing that their email. */
export interface UserRef {
  customerCode?: string | null;
  email?: string | null;
}

async function findUser(ref: UserRef) {
  if (ref.customerCode) {
    const byCode = await prisma.user.findUnique({ where: { paystackCustomerCode: ref.customerCode } });
    if (byCode) return byCode;
  }
  if (ref.email) {
    return prisma.user.findFirst({ where: { email: { equals: ref.email.trim(), mode: "insensitive" } } });
  }
  return null;
}

export type ActivationOutcome = "activated" | "updated" | "user_not_found";

/**
 * Called when Paystack confirms the user's BVN and creates their virtual account. That is the moment
 * the wallet comes alive: the ledger account is created, and the user is marked verified with the
 * account number they can now pay into. Safe to run twice (Paystack retries webhooks): a repeat just
 * refreshes the account details and doesn't notify again.
 */
export async function activateWallet(ref: UserRef, details: WalletAccountDetails): Promise<ActivationOutcome> {
  const user = await findUser(ref);
  if (!user) return "user_not_found";

  const wasActive = user.kycVerified && !!user.depositAccountId;

  await inLedgerTransaction(async (tx) => {
    const walletId = await ensureUserWallet(user.id, tx);
    await tx.user.update({
      where: { id: user.id },
      data: {
        depositAccountId: walletId,
        kycVerified: true,
        kycTier: 2,
        kycFailedReason: null,
        vaCreationFailed: false,
        vaFailureReason: null,
        vaAccountNumber: details.accountNumber,
        vaAccountName: details.accountName,
        vaBankName: details.bankName,
        // An event can reach us before the signup-time customer creation was saved; remember the code.
        ...(ref.customerCode && !user.paystackCustomerCode ? { paystackCustomerCode: ref.customerCode } : {}),
      },
    });
  });

  if (wasActive) return "updated";

  await createNotification({
    userId: user.id,
    notificationType: "KYC_STATUS",
    message: `Identity verified! Your wallet is ready. Pay into ${details.bankName ?? "your account"} ${details.accountNumber} to add money.`,
    link: "/wallet",
  });
  return "activated";
}

export type RejectionOutcome = "rejected" | "ignored_already_verified" | "user_not_found";

/**
 * Paystack couldn't verify the user. A verified user is never downgraded by a failure event: a
 * redelivered or out-of-order "failed" must not take away a wallet that has since been created.
 */
export async function rejectKyc(ref: UserRef, reason: string): Promise<RejectionOutcome> {
  const user = await findUser(ref);
  if (!user) return "user_not_found";
  if (user.kycVerified) return "ignored_already_verified";

  await prisma.user.update({ where: { id: user.id }, data: { kycVerified: false, kycFailedReason: reason } });
  await createNotification({
    userId: user.id,
    notificationType: "KYC_STATUS",
    message: `KYC rejected: ${reason}`,
    link: "/settings/kyc",
  });
  return "rejected";
}
