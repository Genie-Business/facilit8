import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";

/**
 * Called from Event Manager signup. The first person to use an organization name becomes
 * its OWNER (auto-approved); anyone else who later selects that same org gets a PENDING
 * membership the owner must approve. Keeps Event Manager signup instant either way — no
 * platform action is currently gated on membership status, so a PENDING row never blocks
 * event creation.
 */
export async function joinOrCreateOrganization(userId: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) return;

  const existing = await prisma.organization.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
  });

  if (existing) {
    await prisma.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId: existing.id, userId } },
      create: { organizationId: existing.id, userId, role: "MEMBER", status: "PENDING" },
      update: {},
    });
    return;
  }

  const slug = await generateUniqueSlug(
    trimmed,
    async (candidate) => (await prisma.organization.findUnique({ where: { slug: candidate } })) !== null
  );

  const organization = await prisma.organization.create({
    data: { name: trimmed, slug },
  });

  await prisma.organizationMembership.create({
    data: { organizationId: organization.id, userId, role: "OWNER", status: "APPROVED", respondedAt: new Date() },
  });
}

/**
 * Used by the Professional signup form's organization picker. Only CAC-verified
 * organizations are offered — Professionals can't be "attached as employees" to an
 * organization that hasn't proven it's a real registered business.
 */
export async function listOrganizationsForPicker() {
  return prisma.organization.findMany({
    where: { verificationStatus: "VERIFIED" },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/** Creates a PENDING membership request against an existing organization. Never creates one. */
export async function requestOrganizationMembership(userId: string, organizationId: string): Promise<void> {
  const organization = await prisma.organization.findUnique({ where: { id: organizationId } });
  if (!organization) return;

  await prisma.organizationMembership.upsert({
    where: { organizationId_userId: { organizationId, userId } },
    create: { organizationId, userId, role: "MEMBER", status: "PENDING" },
    update: {},
  });
}

/** Pending join requests for organizations the given user owns. */
export async function listPendingMembershipRequests(ownerId: string) {
  const owned = await prisma.organizationMembership.findMany({
    where: { userId: ownerId, role: "OWNER", status: "APPROVED" },
    select: { organizationId: true },
  });
  const organizationIds = owned.map((m) => m.organizationId);
  if (organizationIds.length === 0) return [];

  return prisma.organizationMembership.findMany({
    where: { organizationId: { in: organizationIds }, status: "PENDING" },
    include: { user: true, organization: true },
    orderBy: { requestedAt: "asc" },
  });
}

export async function respondToMembershipRequest(
  membershipId: string,
  responderId: string,
  approve: boolean
): Promise<void> {
  const membership = await prisma.organizationMembership.findUnique({ where: { id: membershipId } });
  if (!membership) throw new Error("Membership request not found.");

  const isOwner = await prisma.organizationMembership.findFirst({
    where: { organizationId: membership.organizationId, userId: responderId, role: "OWNER", status: "APPROVED" },
  });
  if (!isOwner) throw new Error("Not authorized to respond to this request.");

  await prisma.organizationMembership.update({
    where: { id: membershipId },
    data: { status: approve ? "APPROVED" : "REJECTED", respondedAt: new Date() },
  });
}

/** The current user's own affiliation status, for their dashboard/profile. */
export async function getUserOrganizationMembership(userId: string) {
  return prisma.organizationMembership.findFirst({
    where: { userId },
    include: { organization: true },
    orderBy: { requestedAt: "desc" },
  });
}
