import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateMergedTrainingAction } from "@/lib/actions/merged-training.actions";
import { getInviteGroupsForInitiator } from "@/lib/services/merged-training-invite-candidates";
import { MergedTrainingForm } from "@/components/merged-training/merged-training-form";
import { canManageOrganization } from "@/lib/services/organization.service";

export default async function EditMergedTrainingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const mergedEvent = await prisma.mergedTrainingEvent.findUnique({ where: { slug } });
  if (!mergedEvent) notFound();
  if (mergedEvent.initiatorId !== session.user.id) redirect(`/merged-trainings/${slug}`);
  if (mergedEvent.paymentConfirmed) redirect(`/merged-trainings/${slug}`);

  const participantCount = await prisma.mergedTrainingParticipant.count({
    where: { mergedTrainingEventId: mergedEvent.id },
  });
  if (participantCount > 1) redirect(`/merged-trainings/${slug}`);

  const inviteGroups = await getInviteGroupsForInitiator(
    session.user.role as "EVENT_MANAGER" | "PROFESSIONAL" | "FACILITATOR",
    session.user.id
  );
  const canOfferTeamOnly = mergedEvent.organizationId
    ? await canManageOrganization(session.user.id, mergedEvent.organizationId)
    : false;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit merged training session</h1>
      <MergedTrainingForm
        action={updateMergedTrainingAction}
        submitLabel="Save changes"
        inviteGroups={inviteGroups}
        hideInitiatorDelegates={session.user.role === "FACILITATOR"}
        canOfferTeamOnly={canOfferTeamOnly}
        defaults={{
          slug: mergedEvent.slug,
          title: mergedEvent.title,
          description: mergedEvent.description,
          startDate: mergedEvent.startDate,
          endDate: mergedEvent.endDate,
          location: mergedEvent.location,
          delegatesLevel: mergedEvent.delegatesLevel,
          eventCategory: mergedEvent.eventCategory,
          venueType: mergedEvent.venueType,
          totalSlots: mergedEvent.totalSlots,
          pricePerDelegate: mergedEvent.pricePerDelegate.toString(),
          deadline: mergedEvent.deadline,
          isInviteOnly: mergedEvent.isInviteOnly,
          visibility: mergedEvent.visibility,
        }}
      />
    </div>
  );
}
