import { prisma } from "@/lib/db";
import type { InviteGroup } from "@/components/merged-training/merged-training-form";

function label(u: { firstName: string; lastName: string; organization: string | null }): string {
  return u.organization || `${u.firstName} ${u.lastName}`;
}

/** Who a given initiator role can invite to a merged training session, grouped for the form. */
export async function getInviteGroupsForInitiator(
  initiatorRole: "EVENT_MANAGER" | "PROFESSIONAL" | "FACILITATOR",
  excludeUserId: string
): Promise<InviteGroup[]> {
  const select = { id: true, firstName: true, lastName: true, organization: true } as const;

  if (initiatorRole === "FACILITATOR") {
    const [organisations, facilitators] = await Promise.all([
      prisma.user.findMany({ where: { role: "EVENT_MANAGER" }, select, take: 100 }),
      prisma.user.findMany({ where: { role: "FACILITATOR", id: { not: excludeUserId } }, select, take: 100 }),
    ]);
    return [
      { heading: "Invite organisations to fund", options: organisations.map((u) => ({ id: u.id, label: label(u) })) },
      { heading: "Invite co-facilitators", options: facilitators.map((u) => ({ id: u.id, label: label(u) })) },
    ];
  }

  const peers = await prisma.user.findMany({ where: { role: initiatorRole, id: { not: excludeUserId } }, select, take: 100 });
  return [
    {
      heading: initiatorRole === "PROFESSIONAL" ? "Invite fellow professionals" : "Invite companies",
      options: peers.map((u) => ({ id: u.id, label: label(u) })),
    },
  ];
}
