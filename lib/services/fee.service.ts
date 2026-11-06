import { prisma } from "@/lib/db";
import type { PlatformFeeScope } from "@/lib/generated/prisma/client";
import { calculateCappedFee, calculateFeeAmount } from "./payout-math";

export interface FeeSchedule {
  percentage: number;
  /** Ceiling in naira; null = uncapped. */
  maxAmount: number | null;
}

async function activeFee(scope: PlatformFeeScope) {
  return prisma.platformFee.findFirst({
    where: { scope, isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });
}

/** What's currently charged for a scope — 0% and uncapped when no fee is active. */
export async function getFeeSchedule(scope: PlatformFeeScope): Promise<FeeSchedule> {
  const fee = await activeFee(scope);
  return {
    percentage: fee ? Number(fee.percentage) : 0,
    maxAmount: fee?.maxAmount != null ? Number(fee.maxAmount) : null,
  };
}

/** Fixes Django's duplicate PlatformFee/PlatformFeeMergerTraining models — one table, scoped. */
export async function calculateFee(scope: PlatformFeeScope, amount: number): Promise<number> {
  const fee = await activeFee(scope);
  if (!fee) return 0;
  const raw = calculateFeeAmount(amount, Number(fee.percentage));
  // Payout fees carry no cap, so their arithmetic stays exactly as it always was.
  return fee.maxAmount != null ? Math.min(raw, Number(fee.maxAmount)) : raw;
}

/** The fee a withdrawal of `amount` is charged: the active percentage, capped, to the kobo. */
export async function calculateWithdrawalFee(amount: number): Promise<number> {
  const { percentage, maxAmount } = await getFeeSchedule("WITHDRAWAL");
  return calculateCappedFee(amount, percentage, maxAmount);
}
