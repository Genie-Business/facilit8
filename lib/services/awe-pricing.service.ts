import { prisma } from "@/lib/db";

/** Returns the single active AwePricing row, creating a sensible default if none exists yet. */
export async function getActiveAwePricing() {
  const existing = await prisma.awePricing.findFirst({ where: { isActive: true }, orderBy: { createdAt: "desc" } });
  if (existing) return existing;

  return prisma.awePricing.create({ data: { monthlyPrice: 5000, durationDays: 30, isFree: false, isActive: true } });
}

interface UpdateAwePricingInput {
  monthlyPrice: number;
  durationDays: number;
  isFree: boolean;
}

/**
 * Deactivate-then-create, matching the ChatPricing/PlatformFee "latest active row wins"
 * convention — preserves a full price-change history rather than overwriting in place.
 */
export async function updateAwePricing(input: UpdateAwePricingInput) {
  await prisma.$transaction([
    prisma.awePricing.updateMany({ where: { isActive: true }, data: { isActive: false } }),
    prisma.awePricing.create({
      data: {
        monthlyPrice: input.monthlyPrice,
        durationDays: input.durationDays,
        isFree: input.isFree,
        isActive: true,
      },
    }),
  ]);
}
