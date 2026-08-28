import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { voteForBidAction } from "@/lib/actions/merged-training.actions";
import { eligibleVoterIds } from "@/lib/services/merged-training-voting.service";
import { VerifiedBadge } from "@/components/shared/verified-badge";

export default async function MergedTrainingApplicationsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const mergedEvent = await prisma.mergedTrainingEvent.findUnique({
    where: { slug },
    include: {
      participants: true,
      invites: true,
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
          votes: true,
        },
      },
    },
  });
  if (!mergedEvent) notFound();

  const voterIds = eligibleVoterIds(mergedEvent);
  const canVote = voterIds.includes(session.user.id);
  if (!canVote) redirect(`/merged-trainings/${slug}`);

  const votingOpen = new Date() > mergedEvent.deadline && !mergedEvent.selectedTrainerId;
  const totalVoters = voterIds.length;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Bids for &quot;{mergedEvent.title}&quot;</h1>

      {!votingOpen && !mergedEvent.selectedTrainerId && (
        <p className="text-sm text-muted-foreground">
          Voting opens once the funding deadline ({mergedEvent.deadline.toLocaleDateString()}) passes.
        </p>
      )}

      {mergedEvent.applications.length === 0 && <p className="text-muted-foreground">No applications yet.</p>}

      <div className="space-y-4">
        {mergedEvent.applications.map((application) => {
          const myVote = application.votes.find((v) => v.voterId === session.user.id);
          return (
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
                  {application.budgetPerDelegate && (
                    <p className="text-xs text-muted-foreground">
                      Budget per delegate (legacy field): ₦{Number(application.budgetPerDelegate).toLocaleString()}
                    </p>
                  )}
                </div>
                <p className="text-muted-foreground">
                  {application.votes.length}/{totalVoters} votes
                </p>
                {votingOpen &&
                  (myVote ? (
                    <Button disabled variant="outline" size="sm">
                      You voted for this
                    </Button>
                  ) : (
                    <form action={voteForBidAction}>
                      <input type="hidden" name="slug" value={mergedEvent.slug} />
                      <input type="hidden" name="applicationId" value={application.id} />
                      <Button type="submit" size="sm">
                        Vote
                      </Button>
                    </form>
                  ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
