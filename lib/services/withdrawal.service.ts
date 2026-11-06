import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { getAccountBalance } from "@/lib/anchor/accounts";
import { nipTransfer, verifyTransfer } from "@/lib/anchor/transfers";
import { describeAnchorError } from "@/lib/anchor/types";
import { calculateWithdrawalFee } from "./fee.service";
import { roundKobo } from "./payout-math";
import { classifyTransferStatus, feeMetadata, settleWithdrawal } from "./withdrawal-settlement.service";

interface WithdrawResult {
  success: boolean;
  error?: string;
  /** What the user is charged, and what reaches their bank — together they make up the amount they entered. */
  feeAmount?: number;
  netAmount?: number;
  /** The bank hasn't confirmed yet; the transaction list will show it as pending until it does. */
  pending?: boolean;
}

/**
 * Mirrors Django's webapp/views.py withdrawal flow: password re-confirmation + live balance check.
 *
 * `amount` is what leaves the wallet. The bank receives `amount - fee` (NIP), and the fee goes to
 * the platform settlement account — but only once the bank payout is confirmed, which is
 * withdrawal-settlement.service's job (see there for why it isn't done inline).
 */
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

  const amount = roundKobo(params.amount);
  if (!(amount > 0)) return { success: false, error: "Enter an amount greater than zero." };

  const balance = await getAccountBalance(user.depositAccountId);
  if (amount > balance) {
    return { success: false, error: `Insufficient balance (₦${balance.toLocaleString()}).` };
  }

  const feeAmount = await calculateWithdrawalFee(amount);
  const netAmount = roundKobo(amount - feeAmount);
  if (netAmount <= 0) {
    return {
      success: false,
      error: `That amount is too small to cover the withdrawal fee (₦${feeAmount.toLocaleString()}). Try a larger amount.`,
    };
  }

  // Refuse up front rather than send the payout and then find there's nowhere to put the fee.
  if (feeAmount > 0 && !process.env.ANCHOR_SETTLEMENT_ACCOUNT_ID) {
    return { success: false, error: "Withdrawals are temporarily unavailable. Please try again later." };
  }

  const reference = `wd_${userId.slice(0, 8)}_${Date.now().toString(36)}`;
  const base = {
    userId,
    type: "WITHDRAWAL" as const,
    amount,
    feeAmount,
    netAmount,
    currency: "NGN",
    reference,
  };

  let transferId: string;
  try {
    ({ transferId } = await nipTransfer({
      sourceAccountId: user.depositAccountId,
      counterpartyId: user.anchorCounterpartyId,
      amountNaira: netAmount,
      reason: "Withdrawal via Facilit8",
      reference,
    }));
  } catch (err) {
    await prisma.transaction.create({
      data: { ...base, status: "FAILED", description: "Withdrawal failed", metadata: feeMetadata({ status: "NONE" }) },
    });
    return { success: false, error: describeAnchorError(err) };
  }

  // The payout is now in flight. From here on nothing may report the withdrawal as failed unless
  // Anchor says so — a lookup that errors out is "pending", not "failed", or the user is told it
  // failed (and may try again) while the money is already on its way.
  let outcome = classifyTransferStatus("pending");
  try {
    outcome = classifyTransferStatus(await verifyTransfer(transferId));
  } catch (err) {
    console.error(`Could not confirm withdrawal transfer ${transferId}; leaving it pending:`, err);
  }

  const transaction = await prisma.transaction.create({
    data: {
      ...base,
      status: outcome,
      anchorTransferId: transferId,
      counterpartyAccountNumber: user.linkedAccountNumber ?? undefined,
      counterpartyBankCode: user.linkedBankCode ?? undefined,
      description:
        outcome === "FAILED" || outcome === "REVERSED"
          ? "Withdrawal failed"
          : `Withdrawal to ${user.linkedBankName ?? "linked bank account"}`,
      metadata: feeMetadata({ status: feeAmount > 0 && outcome !== "FAILED" && outcome !== "REVERSED" ? "PENDING" : "NONE" }),
    },
  });

  if (outcome === "FAILED" || outcome === "REVERSED") {
    return { success: false, error: "Your bank couldn't process this withdrawal. You haven't been charged." };
  }

  // Confirmed already (rare — NIP usually takes a few seconds): take the fee now. Otherwise the
  // webhook or the scheduled reconciliation will, once Anchor confirms the payout.
  if (outcome === "SUCCESS") {
    try {
      await settleWithdrawal(transaction.id);
    } catch (err) {
      // The money has gone and the user's request succeeded; the fee stays PENDING and the
      // scheduled reconciliation picks it up.
      console.error(`Fee collection could not start for withdrawal ${transaction.id}:`, err);
    }
  }

  return { success: true, feeAmount, netAmount, pending: outcome === "PENDING" };
}
