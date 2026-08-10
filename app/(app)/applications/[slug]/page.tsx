import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ApplicationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const application = await prisma.application.findUnique({
    where: { slug },
    include: {
      trainer: { select: { id: true, firstName: true, lastName: true, slug: true } },
      trainingEvent: { select: { id: true, slug: true, title: true, companyId: true } },
    },
  });
  if (!application) notFound();

  const isTrainer = application.trainerId === session.user.id;
  const isEventOwner = application.trainingEvent.companyId === session.user.id;
  if (!isTrainer && !isEventOwner) redirect("/events");

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Application for{" "}
          <Link href={`/events/${application.trainingEvent.slug}`} className="hover:underline">
            {application.trainingEvent.title}
          </Link>
        </h1>
        <p className="text-muted-foreground">
          By{" "}
          <Link href={`/facilitators/${application.trainer.slug}`} className="hover:underline">
            {application.trainer.firstName} {application.trainer.lastName}
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Bid details
            <Badge>{application.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Budget per delegate: ₦{Number(application.budgetPerDelegate).toLocaleString()}</p>
          {application.courseBreakdown && (
            <p>
              <span className="text-muted-foreground">Course breakdown:</span> {application.courseBreakdown}
            </p>
          )}
          {application.objective && (
            <p>
              <span className="text-muted-foreground">Objective:</span> {application.objective}
            </p>
          )}
          {application.classActivities && (
            <p>
              <span className="text-muted-foreground">Class activities:</span> {application.classActivities}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
