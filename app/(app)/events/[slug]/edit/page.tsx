import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { updateEventAction } from "@/lib/actions/event.actions";
import { EventForm } from "@/components/events/event-form";
import { canManageOrganization } from "@/lib/services/organization.service";

export default async function EditEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const event = await prisma.trainingEvent.findUnique({ where: { slug } });
  if (!event) notFound();
  if (event.companyId !== session.user.id) redirect(`/events/${slug}`);
  if (event.selectedTrainerId) redirect(`/events/${slug}`);

  const canOfferTeamOnly = event.organizationId
    ? await canManageOrganization(session.user.id, event.organizationId)
    : false;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Edit event</h1>
      <EventForm
        action={updateEventAction}
        submitLabel="Save changes"
        canOfferTeamOnly={canOfferTeamOnly}
        defaults={{
          visibility: event.visibility,
          slug: event.slug,
          title: event.title,
          startDate: event.startDate,
          endDate: event.endDate,
          location: event.location,
          capacity: event.capacity,
          skillType: event.skillType,
          expectedTrainingSkills: event.expectedTrainingSkills,
          eventObjective: event.eventObjective,
          delegatesLevel: event.delegatesLevel,
          eventCategory: event.eventCategory,
          venueType: event.venueType,
          seriesLength: event.seriesLength,
          eventExpiryDate: event.eventExpiryDate,
          eventDetails: event.eventDetails,
          trainingMaterials: event.trainingMaterials,
          trainingBudget: event.trainingBudget.toString(),
        }}
      />
    </div>
  );
}
