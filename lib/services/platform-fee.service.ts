import { prisma } from "@/lib/db";
import type { PlatformFee, PlatformFeeScope } from "@/lib/generated/prisma/client";

// The percentage-based fees. CHAT_ACCESS is deliberately not here: chat is a flat naira fee
// (ChatPricing, set via chat-pricing.service.ts), and nothing ever applied a percentage to it.
// The enum value stays in the schema only because dropping it would need a migration.
export const PLATFORM_FEE_SCOPES: PlatformFeeScope[] = [
  "FACILITATOR_PAYOUT",
  "MERGED_TRAINING_PAYOUT",
  "WITHDRAWAL",
];

export const PLATFORM_FEE_SCOPE_LABELS: Record<PlatformFeeScope, string> = {
  FACILITATOR_PAYOUT: "Facilitator payout (standard events)",
  MERGED_TRAINING_PAYOUT: "Facilitator payout (merged trainings)",
  CHAT_ACCESS: "Chat access (flat fee — see ChatPricing)",
  WITHDRAWAL: "Wallet withdrawal",
};

/** The current active fee row per scope, keyed by scope — undefined means 0% (calculateFee's
 * own fallback when no active row exists for a scope). */
export async function getActiveFeesByScope(): Promise<Map<PlatformFeeScope, PlatformFee>> {
  const active = await prisma.platformFee.findMany({
    where: { scope: { in: PLATFORM_FEE_SCOPES }, isActive: true },
    orderBy: { effectiveFrom: "desc" },
  });
  const byScope = new Map<PlatformFeeScope, PlatformFee>();
  for (const fee of active) {
    if (!byScope.has(fee.scope)) byScope.set(fee.scope, fee);
  }
  return byScope;
}

/**
 * Sets the active percentage for a scope. Deactivates any other active row for that scope
 * first so calculateFee's "most recent active row" lookup is always unambiguous, while
 * keeping every past row around (isActive: false) as an audit trail of fee changes over time.
 */
export async function setPlatformFee(scope: PlatformFeeScope, percentage: number): Promise<void> {
  await prisma.$transaction([
    prisma.platformFee.updateMany({ where: { scope, isActive: true }, data: { isActive: false } }),
    prisma.platformFee.create({ data: { scope, percentage, isActive: true } }),
  ]);
}

/** Turns a scope's fee back off (0%) without deleting its history. */
export async function deactivatePlatformFee(scope: PlatformFeeScope): Promise<void> {
  await prisma.platformFee.updateMany({ where: { scope, isActive: true }, data: { isActive: false } });
}
