import { prisma } from "@/lib/db";
import type { PlatformFeeScope } from "@/lib/generated/prisma/client";

/** Fixes Django's duplicate PlatformFee/PlatformFeeMergerTraining models — one table, scoped. */
export async function calculateFee(scope: PlatformFeeScope, amount: number): Promise<number> {
  const fee = await prisma.platformFee.findFirst({
    where: { scope, isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });
  if (!fee) return 0;
  return amount * (Number(fee.percentage) / 100);
}
