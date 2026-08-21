import { randomBytes, createHash } from "node:crypto";

import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email/resend";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { provisionAnchorCustomer } from "@/lib/services/anchor-provisioning.service";
import type { OrgMemberRole } from "@/lib/generated/prisma/client";

const INVITE_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d

interface InviteResult {
  success: boolean;
  error?: string;
}

/** OWNER/MANAGER only — same authorization check updateMemberRole already uses. Inviting
 * *is* the approval, so redemption below creates an already-APPROVED membership directly,
 * unlike the self-service request-to-join flow in organization.service.ts. */
export async function sendOrgInvite(
  organizationId: string,
  inviterId: string,
  email: string,
  role: Extract<OrgMemberRole, "MANAGER" | "MEMBER">
): Promise<InviteResult> {
  const [organization, canInvite] = await Promise.all([
    prisma.organization.findUnique({ where: { id: organizationId } }),
    prisma.organizationMembership.findFirst({
      where: { organizationId, userId: inviterId, role: { in: ["OWNER", "MANAGER"] }, status: "APPROVED" },
    }),
  ]);
  if (!organization) return { success: false, error: "Organization not found." };
  if (!canInvite) return { success: false, error: "Only the organization owner or a manager can send invites." };

  const existingMember = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existingMember) {
    const alreadyMember = await prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId: existingMember.id } },
    });
    if (alreadyMember) return { success: false, error: "This person is already a member (or has a pending request)." };
  }

  const rawToken = randomBytes(32).toString("hex");
  await prisma.organizationInvite.create({
    data: {
      organizationId,
      invitedByUserId: inviterId,
      email,
      role,
      tokenHash: createHash("sha256").update(rawToken).digest("hex"),
      expiresAt: new Date(Date.now() + INVITE_TOKEN_TTL_MS),
    },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/invite/${rawToken}`;
  await sendEmail({
    to: email,
    subject: `You're invited to join ${organization.name} on Facilit8`,
    html: `<p>You've been invited to join <strong>${organization.name}</strong> on Facilit8.</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
      <p>This link expires in 7 days.</p>`,
  });

  return { success: true };
}

export async function getOrgInviteByToken(rawToken: string) {
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const invite = await prisma.organizationInvite.findUnique({
    where: { tokenHash },
    include: { organization: true },
  });
  if (!invite || invite.usedAt || invite.expiresAt < new Date()) return null;
  return invite;
}

/** Redeems an invite for someone who already has a Facilit8 account (any role) — creates
 * an already-APPROVED membership immediately, no separate owner-approval round-trip. */
export async function redeemOrgInviteForExistingUser(rawToken: string, userId: string): Promise<InviteResult> {
  const invite = await getOrgInviteByToken(rawToken);
  if (!invite) return { success: false, error: "This invite link is invalid or has expired." };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.email !== invite.email) {
    return { success: false, error: "This invite was sent to a different email address." };
  }

  await prisma.$transaction([
    prisma.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId } },
      create: { organizationId: invite.organizationId, userId, role: invite.role, status: "APPROVED", respondedAt: new Date() },
      update: { role: invite.role, status: "APPROVED", respondedAt: new Date() },
    }),
    prisma.organizationInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
  ]);

  return { success: true };
}

interface NewAccountInput {
  firstName: string;
  lastName: string;
  mobilePhone: string;
  password: string;
}

/** Redeems an invite for someone who doesn't have an account yet — creates a new
 * EVENT_MANAGER user (mirrors signupAction's account-creation, minus the org-picker step
 * since the org is already determined by the invite) plus an already-APPROVED membership,
 * then provisions their own individual Anchor wallet exactly like any other new user. */
export async function redeemOrgInviteForNewAccount(
  rawToken: string,
  input: NewAccountInput
): Promise<InviteResult & { userId?: string }> {
  const invite = await getOrgInviteByToken(rawToken);
  if (!invite) return { success: false, error: "This invite link is invalid or has expired." };

  const [emailTaken, phoneTaken] = await Promise.all([
    prisma.user.findUnique({ where: { email: invite.email } }),
    prisma.user.findUnique({ where: { mobilePhone: input.mobilePhone } }),
  ]);
  if (emailTaken) return { success: false, error: "An account with this email already exists. Please log in instead." };
  if (phoneTaken) return { success: false, error: "An account with this phone number already exists." };

  const passwordHash = await bcrypt.hash(input.password, 12);
  const slug = await generateUniqueSlug(
    `${input.firstName}-${input.lastName}`,
    async (candidate) => (await prisma.user.findUnique({ where: { slug: candidate } })) !== null
  );

  const user = await prisma.user.create({
    data: {
      email: invite.email,
      passwordHash,
      role: "EVENT_MANAGER",
      firstName: input.firstName,
      lastName: input.lastName,
      mobilePhone: input.mobilePhone,
      slug,
    },
  });

  await prisma.$transaction([
    prisma.organizationMembership.create({
      data: { organizationId: invite.organizationId, userId: user.id, role: invite.role, status: "APPROVED", respondedAt: new Date() },
    }),
    prisma.organizationInvite.update({ where: { id: invite.id }, data: { usedAt: new Date() } }),
  ]);

  // Never let account creation fail because Anchor is slow/unreachable — provisioning
  // records its own failure state on the user row and can be retried later (same as signupAction).
  await provisionAnchorCustomer(user.id);

  return { success: true, userId: user.id };
}
