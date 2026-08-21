import { prisma } from "@/lib/db";

export interface OrganizationTrainingHistoryInput {
  title: string;
  provider?: string | null;
  dateCompleted: Date;
  notes?: string | null;
}

export async function listOrganizationTrainingHistory(organizationId: string) {
  return prisma.organizationTrainingHistory.findMany({
    where: { organizationId },
    orderBy: { dateCompleted: "desc" },
  });
}

/** OWNER/MANAGER only, mirroring the authorization already used for other org-scoped
 * writes (updateMemberRole, sendOrgInvite). */
async function requireOrgWriteAccess(organizationId: string, userId: string): Promise<void> {
  const membership = await prisma.organizationMembership.findFirst({
    where: { organizationId, userId, role: { in: ["OWNER", "MANAGER"] }, status: "APPROVED" },
  });
  if (!membership) throw new Error("Not authorized to manage this organization's training history.");
}

export async function createOrganizationTrainingHistory(
  organizationId: string,
  userId: string,
  input: OrganizationTrainingHistoryInput
) {
  await requireOrgWriteAccess(organizationId, userId);
  return prisma.organizationTrainingHistory.create({ data: { organizationId, ...input } });
}

export async function deleteOrganizationTrainingHistory(id: string, organizationId: string, userId: string) {
  await requireOrgWriteAccess(organizationId, userId);
  const existing = await prisma.organizationTrainingHistory.findUnique({ where: { id } });
  if (!existing || existing.organizationId !== organizationId) throw new Error("Record not found.");
  return prisma.organizationTrainingHistory.delete({ where: { id } });
}
