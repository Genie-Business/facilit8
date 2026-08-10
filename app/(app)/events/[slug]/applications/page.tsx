import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { selectApplicationAction } from "@/lib/actions/application.actions";

export default async function EventApplicationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const event = await prisma.trainingEvent.findUnique({
    where: { slug },
    include: {
      applications: {
        orderBy: { appliedAt: "desc" },
        include: { trainer: { select: { firstName: true, lastName: true, slug: true, specialization: true } } },
      },
    },
  });
  if (!event) notFound();
  if (event.companyId !== session.user.id) redirect(`/events/${slug}`);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Applications for &quot;{event.title}&quot;</h1>

      {event.applications.length === 0 && <p className="text-muted-foreground">No applications yet.</p>}

      <div className="space-y-4">
        {event.applications.map((application) => (
          <Card key={application.id}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <Link href={`/facilitators/${application.trainer.slug}`} className="hover:underline">
                  {application.trainer.firstName} {application.trainer.lastName}
                </Link>
                <Badge
                  variant={
                    application.status === "ACCEPTED"
                      ? "secondary"
                      : application.status === "REJECTED"
                        ? "outline"
                        : "default"
                  }
                >
                  {application.status}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
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
              {event.isAvailable && (
                <form action={selectApplicationAction}>
                  <input type="hidden" name="applicationSlug" value={application.slug} />
                  <Button type="submit" size="sm">
                    Select this facilitator
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
