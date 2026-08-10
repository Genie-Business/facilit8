import { prisma } from "@/lib/db";
import { submitIndividualVerification } from "@/lib/anchor/customers";

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
    return { success: false, error: "Account provisioning is still in progress — try again shortly." };
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
    // payment/views.py::kyc_verification_view.
    if (err instanceof Error && /already.*verif/i.test(err.message)) {
      await prisma.user.update({ where: { id: userId }, data: { kycVerified: true } });
      return { success: true };
    }
    const message = err instanceof Error ? err.message : "KYC submission failed.";
    await prisma.user.update({ where: { id: userId }, data: { kycFailedReason: message } });
    return { success: false, error: message };
  }
}
