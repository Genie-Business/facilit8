import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { createEventAction } from "@/lib/actions/event.actions";
import { EventForm } from "@/components/events/event-form";
import { getApprovedOrganizationId, canManageOrganization } from "@/lib/services/organization.service";

export default async function NewEventPage() {
  const session = await auth();
  if (session?.user.role !== "EVENT_MANAGER") {
    redirect("/events");
  }

  const organizationId = await getApprovedOrganizationId(session.user.id);
  const canOfferTeamOnly = organizationId ? await canManageOrganization(session.user.id, organizationId) : false;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create a training event</h1>
      <EventForm action={createEventAction} submitLabel="Create event" canOfferTeamOnly={canOfferTeamOnly} />
    </div>
  );
}
