import { prisma } from "@/lib/db";
import { assignDedicatedAccount } from "@/lib/paystack/api";
import { describePaystackError, isPaystackConfigured } from "@/lib/paystack/client";

interface KycResult {
  success: boolean;
  error?: string;
}

/**
 * Starts identity verification, which is also what creates the user's wallet: Paystack checks the
 * BVN against the bank account the user linked (the BVN holder must own that account) and, if it
 * matches, assigns them a dedicated virtual account to pay into. The answer is NOT in this call's
 * response — Paystack replies "in progress" and reports the outcome by webhook, which activates
 * the wallet (or records why not). See lib/paystack/webhooks.ts.
 */
export async function submitKyc(
  userId: string,
  params: { bvn: string; dateOfBirth: Date; gender: "MALE" | "FEMALE" }
): Promise<KycResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found." };
  if (user.kycVerified) return { success: false, error: "You're already verified." };
  if (!isPaystackConfigured()) return { success: false, error: "Payments aren't configured yet." };
  if (!user.linkedBankCode || !user.linkedAccountNumber) {
    return {
      success: false,
      error: "Link your bank account first. We check your BVN against it, so it has to be an account in your own name.",
    };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { bvn: params.bvn, dateOfBirth: params.dateOfBirth, gender: params.gender, kycFailedReason: null },
  });

  try {
    await assignDedicatedAccount({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.mobilePhone,
      bvn: params.bvn,
      accountNumber: user.linkedAccountNumber,
      bankCode: user.linkedBankCode,
    });
    return { success: true };
  } catch (err) {
    const message = describePaystackError(err);
    await prisma.user.update({ where: { id: userId }, data: { kycFailedReason: message } });
    return { success: false, error: message };
  }
}
