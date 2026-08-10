import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { getAccountBalance } from "@/lib/anchor/accounts";
import { nipTransfer, verifyTransfer } from "@/lib/anchor/transfers";
import { calculateFee } from "./fee.service";

interface WithdrawResult {
  success: boolean;
  error?: string;
}

/** Mirrors Django's webapp/views.py withdrawal flow: password re-confirmation + live balance check. */
export async function withdrawFunds(
  userId: string,
  params: { amount: number; password: string }
): Promise<WithdrawResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { success: false, error: "User not found." };

  const passwordValid = await bcrypt.compare(params.password, user.passwordHash);
  if (!passwordValid) return { success: false, error: "Incorrect password." };

  if (!user.depositAccountId || !user.anchorCounterpartyId) {
    return { success: false, error: "Your bank account isn't linked yet." };
  }

  const balance = await getAccountBalance(user.depositAccountId);
  if (params.amount > balance) {
    return { success: false, error: `Insufficient balance (₦${balance.toLocaleString()}).` };
  }

  const feeAmount = await calculateFee("WITHDRAWAL", params.amount);
  const netAmount = params.amount - feeAmount;
  const reference = `wd_${userId.slice(0, 8)}_${Date.now().toString(36)}`;

  try {
    const { transferId } = await nipTransfer({
      sourceAccountId: user.depositAccountId,
      counterpartyId: user.anchorCounterpartyId,
      amountNaira: netAmount,
      reason: "Withdrawal via Facilit8",
      reference,
    });
    const status = await verifyTransfer(transferId);

    await prisma.transaction.create({
      data: {
        userId,
        type: "WITHDRAWAL",
        status: ["successful", "completed"].includes(status) ? "SUCCESS" : "PENDING",
        amount: params.amount,
        feeAmount,
        netAmount,
        currency: "NGN",
        reference,
        anchorTransferId: transferId,
        counterpartyAccountNumber: user.linkedAccountNumber ?? undefined,
        counterpartyBankCode: user.linkedBankCode ?? undefined,
        description: `Withdrawal to ${user.linkedBankName ?? "linked bank account"}`,
      },
    });

    return { success: true };
  } catch (err) {
    await prisma.transaction.create({
      data: {
        userId,
        type: "WITHDRAWAL",
        status: "FAILED",
        amount: params.amount,
        feeAmount,
        netAmount,
        currency: "NGN",
        reference,
        description: "Withdrawal failed",
      },
    });
    return { success: false, error: err instanceof Error ? err.message : "Withdrawal failed." };
  }
}
