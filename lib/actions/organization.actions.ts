"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { respondToMembershipRequest, updateMemberRole } from "@/lib/services/organization.service";
import { createNotification } from "@/lib/services/notification.service";
import { prisma } from "@/lib/db";

export async function respondToMembershipRequestAction(membershipId: string, approve: boolean): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated.");

  await respondToMembershipRequest(membershipId, session.user.id, approve);

  const membership = await prisma.organizationMembership.findUnique({
    where: { id: membershipId },
    include: { organization: true },
  });

  if (membership) {
    await createNotification({
      userId: membership.userId,
      notificationType: "SYSTEM",
      message: approve
        ? `Your request to join ${membership.organization.name} was approved.`
        : `Your request to join ${membership.organization.name} was declined.`,
    });
  }

  revalidatePath("/dashboard");
}

export async function updateMemberRoleAction(
  organizationId: string,
  membershipId: string,
  newRole: "MANAGER" | "MEMBER"
): Promise<void> {
  const session = await auth();
  if (!session) throw new Error("Not authenticated.");

  const result = await updateMemberRole(organizationId, session.user.id, membershipId, newRole);
  if (!result.success) throw new Error(result.error);

  const membership = await prisma.organizationMembership.findUnique({
    where: { id: membershipId },
    include: { organization: true },
  });
  if (membership) {
    await createNotification({
      userId: membership.userId,
      notificationType: "SYSTEM",
      message: `Your role at ${membership.organization.name} was changed to ${newRole === "MANAGER" ? "Manager" : "Member"}.`,
    });
  }

  revalidatePath("/organization/members");
}
