import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { createEventAction } from "@/lib/actions/event.actions";
import { EventForm } from "@/components/events/event-form";

export default async function NewEventPage() {
  const session = await auth();
  if (session?.user.role !== "EVENT_MANAGER") {
    redirect("/events");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Create a training event</h1>
      <EventForm action={createEventAction} submitLabel="Create event" />
    </div>
  );
}
