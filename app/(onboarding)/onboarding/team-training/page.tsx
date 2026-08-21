import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BackLink } from "@/components/onboarding/back-link";
import { OrganizationTrainingHistorySection } from "@/components/onboarding/organization-training-history-section";
import { continueFromTeamTrainingAction } from "@/lib/actions/onboarding.actions";
import { auth } from "@/lib/auth";
import { getUserOrganizationMembership } from "@/lib/services/organization.service";
import { listOrganizationTrainingHistory } from "@/lib/services/organization-training-history.service";

export default async function TeamTrainingPage() {
  const session = await auth();
  const userId = session!.user.id;

  const membership = await getUserOrganizationMembership(userId);
  const history = membership ? await listOrganizationTrainingHistory(membership.organizationId) : [];

  return (
    <div className="space-y-6">
      <BackLink href="/onboarding/professional-profile" />
      <Card>
        <CardHeader>
          <CardTitle>Trainings for your staff</CardTitle>
          <CardDescription>
            Your organization&apos;s own training history, not your personal employment history — individual team
            members add their own when they join.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationTrainingHistorySection
            records={history.map((r) => ({ ...r, dateCompleted: r.dateCompleted.toISOString() }))}
          />
        </CardContent>
      </Card>

      <form action={continueFromTeamTrainingAction}>
        <Button type="submit">Continue</Button>
      </form>
    </div>
  );
}
