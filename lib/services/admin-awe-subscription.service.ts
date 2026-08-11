import { prisma } from "@/lib/db";

const userSelect = { id: true, firstName: true, lastName: true, email: true } as const;

export async function listAweSubscriptions() {
  return prisma.aweSubscription.findMany({
    include: { user: { select: userSelect }, pricing: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAweSubscriptionForUser(userId: string) {
  return prisma.aweSubscription.findUnique({
    where: { userId },
    include: { user: { select: userSelect }, pricing: true },
  });
}

export async function getAweTransactionHistory(userId: string) {
  return prisma.transaction.findMany({
    where: { userId, type: "AWE_SUBSCRIPTION" },
    orderBy: { createdAt: "desc" },
  });
}
