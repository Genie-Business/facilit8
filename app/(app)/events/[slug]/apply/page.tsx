import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApplicationForm } from "@/components/applications/application-form";

export default async function ApplyToEventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session || session.user.role !== "FACILITATOR") redirect(`/events/${slug}`);

  const event = await prisma.trainingEvent.findUnique({ where: { slug } });
  if (!event) notFound();
  if (!event.isAvailable) redirect(`/events/${slug}`);

  const existing = await prisma.application.findUnique({
    where: { trainerId_trainingEventId: { trainerId: session.user.id, trainingEventId: event.id } },
  });
  if (existing) redirect(`/events/${slug}`);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Apply to facilitate &quot;{event.title}&quot;</h1>
      <ApplicationForm eventSlug={event.slug} />
    </div>
  );
}
