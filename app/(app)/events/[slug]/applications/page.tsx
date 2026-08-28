import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { selectApplicationAction } from "@/lib/actions/application.actions";
import { VerifiedBadge } from "@/components/shared/verified-badge";

export default async function EventApplicationsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const event = await prisma.trainingEvent.findUnique({
    where: { slug },
    include: {
      applications: {
        orderBy: { appliedAt: "desc" },
        include: {
          trainer: {
            select: {
              firstName: true,
              lastName: true,
              slug: true,
              specialization: true,
              qualification: true,
              experience: true,
              kycVerified: true,
            },
          },
        },
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
                <div className="flex items-center gap-2">
                  <Link href={`/facilitators/${application.trainer.slug}`} className="hover:underline">
                    {application.trainer.firstName} {application.trainer.lastName}
                  </Link>
                  <VerifiedBadge verified={application.trainer.kycVerified} />
                </div>
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
              {(application.trainer.specialization || application.trainer.qualification || application.trainer.experience) && (
                <p className="text-sm text-muted-foreground">
                  {[application.trainer.specialization, application.trainer.qualification, application.trainer.experience]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-3 rounded-lg border p-4">
                <div>
                  <p className="font-medium text-foreground">Activities</p>
                  <p className="mt-0.5 text-muted-foreground">{application.classActivities || "Not provided."}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">Expected outcomes</p>
                  <p className="mt-0.5 text-muted-foreground">{application.objective || "Not provided."}</p>
                </div>
                {application.courseBreakdown && (
                  <div>
                    <p className="font-medium text-foreground">Course breakdown</p>
                    <p className="mt-0.5 text-muted-foreground">{application.courseBreakdown}</p>
                  </div>
                )}
                {/* Historical applications from before prices were dropped from bids. */}
                {application.budgetPerDelegate && (
                  <p className="text-xs text-muted-foreground">
                    Budget per delegate (legacy field): ₦{Number(application.budgetPerDelegate).toLocaleString()}
                  </p>
                )}
              </div>

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
