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

/** Pending join requests for organizations the given user can approve for (OWNER or MANAGER). */
export async function listPendingMembershipRequests(userId: string) {
  const canApprove = await prisma.organizationMembership.findMany({
    where: { userId, role: { in: ["OWNER", "MANAGER"] }, status: "APPROVED" },
    select: { organizationId: true },
  });
  const organizationIds = canApprove.map((m) => m.organizationId);
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

  const canApprove = await prisma.organizationMembership.findFirst({
    where: {
      organizationId: membership.organizationId,
      userId: responderId,
      role: { in: ["OWNER", "MANAGER"] },
      status: "APPROVED",
    },
  });
  if (!canApprove) throw new Error("Not authorized to respond to this request.");

  await prisma.organizationMembership.update({
    where: { id: membershipId },
    data: { status: approve ? "APPROVED" : "REJECTED", respondedAt: new Date() },
  });
}

/** "Business" vs "individual" Event Manager, for the onboarding fork — determined purely
 * by whether they filled a company name at signup (User.organization), per the user's own
 * instruction: no company name means treat them as an individual with the normal flow.
 * Not derived from current OrganizationMembership state. */
export async function isBusinessEventManager(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { organization: true } });
  return !!user?.organization;
}

/** For event visibility: the org a user can see/create TEAM_ONLY events for, or null if
 * they don't have an APPROVED membership anywhere. Unlike getUserOrganizationMembership
 * (any status, most-recent-first, for dashboard display), this only ever returns an org the
 * user is genuinely an approved part of. */
export async function getApprovedOrganizationId(userId: string): Promise<string | null> {
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, status: "APPROVED" },
    select: { organizationId: true },
  });
  return membership?.organizationId ?? null;
}

/** OWNER/MANAGER only — same authorization level as other org-scoped writes (invites,
 * training history, role changes). Used to gate creating a TEAM_ONLY event. */
export async function canManageOrganization(userId: string, organizationId: string): Promise<boolean> {
  const membership = await prisma.organizationMembership.findFirst({
    where: { userId, organizationId, role: { in: ["OWNER", "MANAGER"] }, status: "APPROVED" },
  });
  return !!membership;
}

/**
 * Single source of truth for the event-visibility rule, shared by createEventAction and
 * updateEventAction: organizationId tags ANY org-affiliated creator's event (so it's
 * attributable to their org even as a plain MEMBER), but TEAM_ONLY visibility is only ever
 * honored when the creator is OWNER/MANAGER of that org — an individual EM (no org) or a
 * plain MEMBER always gets PUBLIC regardless of what the form requested. Funding/ownership
 * is untouched by any of this — see the plan's note on Organization having no wallet.
 */
export async function resolveEventVisibility(
  userId: string,
  requestedVisibility: "PUBLIC" | "TEAM_ONLY" | undefined
): Promise<{ organizationId: string | null; visibility: "PUBLIC" | "TEAM_ONLY" }> {
  const organizationId = await getApprovedOrganizationId(userId);
  const canManage = organizationId ? await canManageOrganization(userId, organizationId) : false;
  const visibility = organizationId && canManage && requestedVisibility === "TEAM_ONLY" ? "TEAM_ONLY" : "PUBLIC";
  return { organizationId, visibility };
}

/** The current user's own affiliation status, for their dashboard/profile. */
export async function getUserOrganizationMembership(userId: string) {
  return prisma.organizationMembership.findFirst({
    where: { userId },
    include: { organization: true },
    orderBy: { requestedAt: "desc" },
  });
}

/** Full member list (any status) for an organization, for the members-management page. */
export async function listOrganizationMembers(organizationId: string) {
  return prisma.organizationMembership.findMany({
    where: { organizationId },
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true, role: true } } },
    orderBy: [{ role: "asc" }, { requestedAt: "asc" }],
  });
}

interface UpdateMemberRoleResult {
  success: boolean;
  error?: string;
}

/**
 * Role changes are OWNER-only (a MANAGER can approve join requests but can't promote peers
 * to MANAGER — avoids a privilege-escalation loop). The OWNER's own row can't be changed
 * here; ownership transfer isn't supported.
 */
export async function updateMemberRole(
  organizationId: string,
  actingUserId: string,
  targetMembershipId: string,
  newRole: "MANAGER" | "MEMBER"
): Promise<UpdateMemberRoleResult> {
  const isOwner = await prisma.organizationMembership.findFirst({
    where: { organizationId, userId: actingUserId, role: "OWNER", status: "APPROVED" },
  });
  if (!isOwner) return { success: false, error: "Only the organization owner can change member roles." };

  const target = await prisma.organizationMembership.findUnique({ where: { id: targetMembershipId } });
  if (!target || target.organizationId !== organizationId) {
    return { success: false, error: "Member not found." };
  }
  if (target.role === "OWNER") {
    return { success: false, error: "Can't change the owner's role." };
  }
  if (target.status !== "APPROVED") {
    return { success: false, error: "Only approved members can have their role changed." };
  }

  await prisma.organizationMembership.update({ where: { id: targetMembershipId }, data: { role: newRole } });
  return { success: true };
}
