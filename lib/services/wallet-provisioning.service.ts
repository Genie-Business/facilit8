import { prisma } from "@/lib/db";
import { createCustomer, createTransferRecipient } from "@/lib/paystack/api";
import { describePaystackError, isPaystackConfigured } from "@/lib/paystack/client";

const NOT_CONFIGURED = "Payments aren't configured yet.";

/**
 * Sets up a new user's Paystack side: a customer record, and a transfer recipient for the bank
 * account they gave at signup (where their withdrawals will be sent). Called from signup, but never
 * throws — failures are recorded on the user row (vaCreationFailed / vaFailureReason) so signup
 * always succeeds and the recovery flow can pick it back up. Each step saves its own result the
 * moment it succeeds, so a failure in the second never loses the first.
 *
 * The wallet itself is NOT created here: that happens once Paystack verifies the user's BVN and
 * assigns their virtual account (see kyc.service and wallet-activation.service).
 */
export async function provisionWallet(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return;

  if (!isPaystackConfigured()) {
    await prisma.user.update({ where: { id: userId }, data: { vaCreationFailed: true, vaFailureReason: NOT_CONFIGURED } });
    return;
  }

  let customerCode = user.paystackCustomerCode;
  if (!customerCode) {
    try {
      ({ customerCode } = await createCustomer({
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.mobilePhone,
        metadata: { facilit8UserId: user.id },
      }));
      await prisma.user.update({ where: { id: userId }, data: { paystackCustomerCode: customerCode, vaFailureReason: null } });
    } catch (err) {
      console.error(`Paystack customer creation failed for user ${userId}:`, err);
      await prisma.user.update({ where: { id: userId }, data: { vaCreationFailed: true, vaFailureReason: describePaystackError(err) } });
      return;
    }
  }

  if (!user.paystackRecipientCode && user.linkedBankCode && user.linkedAccountNumber && user.linkedAccountName) {
    try {
      const recipient = await createTransferRecipient({
        name: user.linkedAccountName,
        accountNumber: user.linkedAccountNumber,
        bankCode: user.linkedBankCode,
      });
      await prisma.user.update({
        where: { id: userId },
        data: {
          paystackRecipientCode: recipient.recipientCode,
          // Paystack's own resolution of the account's name is the authoritative one.
          ...(recipient.accountName ? { linkedAccountName: recipient.accountName } : {}),
          vaCreationFailed: false,
          vaFailureReason: null,
        },
      });
      return;
    } catch (err) {
      console.error(`Paystack recipient creation failed for user ${userId}:`, err);
      await prisma.user.update({ where: { id: userId }, data: { vaCreationFailed: true, vaFailureReason: describePaystackError(err) } });
      return;
    }
  }

  // Customer exists and there's nothing (more) to link: whatever earlier problem was flagged is over.
  if (user.vaCreationFailed) {
    await prisma.user.update({ where: { id: userId }, data: { vaCreationFailed: false, vaFailureReason: null } });
  }
}

export interface UpdateLinkedBankAccountResult {
  success: boolean;
  error?: string;
}

/**
 * Links a (possibly new) withdrawal bank account — used by people who skipped it at signup, by anyone
 * switching banks later, and by account recovery. A Paystack recipient is one specific account, so
 * switching means creating a fresh recipient; the old one is simply left behind.
 */
export async function updateLinkedBankAccount(
  userId: string,
  params: { bankCode: string; bankName: string; accountNumber: string; accountName: string }
): Promise<UpdateLinkedBankAccountResult> {
  if (!isPaystackConfigured()) return { success: false, error: NOT_CONFIGURED };

  try {
    const recipient = await createTransferRecipient({
      name: params.accountName,
      accountNumber: params.accountNumber,
      bankCode: params.bankCode,
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        linkedBankCode: params.bankCode,
        linkedBankName: params.bankName,
        linkedAccountNumber: params.accountNumber,
        linkedAccountName: recipient.accountName ?? params.accountName,
        paystackRecipientCode: recipient.recipientCode,
        vaCreationFailed: false,
        vaFailureReason: null,
      },
    });
    return { success: true };
  } catch (err) {
    console.error(`Failed to link bank account for user ${userId}:`, err);
    const detail = describePaystackError(err);
    return {
      success: false,
      error: /resolve|verify|invalid|not found|could not/i.test(detail)
        ? "We couldn't verify that bank account. Please check the account number and the bank, then try again."
        : detail,
    };
  }
}
