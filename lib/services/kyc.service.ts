import { prisma } from "@/lib/db";
import { submitIndividualVerification } from "@/lib/anchor/customers";
import { AnchorApiError } from "@/lib/anchor/types";
import { createDepositAccount } from "@/lib/anchor/accounts";

interface KycResult {
  success: boolean;
  error?: string;
}

export async function submitKyc(
  userId: string,
  params: { bvn: string; dateOfBirth: Date; gender: "MALE" | "FEMALE" }
): Promise<KycResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found." };
  if (user.kycVerified) return { success: false, error: "You're already verified." };
  if (!user.anchorCustomerId) {
    return { success: false, error: "Account provisioning is still in progress. Try again shortly." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { bvn: params.bvn, dateOfBirth: params.dateOfBirth, gender: params.gender, kycFailedReason: null },
  });

  try {
    await submitIndividualVerification({
      customerId: user.anchorCustomerId,
      bvn: params.bvn,
      dateOfBirth: params.dateOfBirth.toISOString().slice(0, 10),
      gender: params.gender,
    });
    return { success: true };
  } catch (err) {
    // Already-verified is treated as success, matching Django's recovery path in
    // payment/views.py::kyc_verification_view. Checked against err.body, not err.message —
    // AnchorApiError.message is just the generic "Anchor API error (STATUS) for METHOD PATH"
    // wrapper text set in client.ts; the actual detail (e.g. "Kyc information already
    // submitted") only ever lives in .body. Matches both "already submitted" and "already
    // verified" phrasing, since Anchor's exact wording differs by endpoint.
    const alreadyVerified = err instanceof AnchorApiError && /already.*(verif|submit)/i.test(JSON.stringify(err.body));
    if (alreadyVerified) {
      await prisma.user.update({ where: { id: userId }, data: { kycVerified: true } });

      // A customer verified before this local row got linked to it never got the normal
      // customer.identification.approved webhook that creates the wallet — trigger it here
      // too, same as webhooks.ts does, so "already verified" doesn't leave someone walletless.
      if (!user.depositAccountId) {
        try {
          const accountId = await createDepositAccount(user.anchorCustomerId);
          await prisma.user.update({ where: { id: userId }, data: { depositAccountId: accountId } });
        } catch (depositErr) {
          console.error(`Failed to trigger account opening for user ${userId}:`, depositErr);
        }
      }

      return { success: true };
    }
    const message = err instanceof Error ? err.message : "KYC submission failed.";
    await prisma.user.update({ where: { id: userId }, data: { kycFailedReason: message } });
    return { success: false, error: message };
  }
}
