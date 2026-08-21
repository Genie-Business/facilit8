import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/onboarding/back-link";
import { TeamDirectionForm } from "@/components/onboarding/team-direction-form";
import { auth } from "@/lib/auth";
import { getUserOrganizationMembership } from "@/lib/services/organization.service";
import { getOrganizationProfile } from "@/lib/services/organization-profile.service";

export default async function TeamDirectionPage() {
  const session = await auth();
  const userId = session!.user.id;

  const membership = await getUserOrganizationMembership(userId);
  const profile = membership ? await getOrganizationProfile(membership.organizationId) : null;

  return (
    <div className="space-y-4">
      <BackLink href="/onboarding/team-training" />
      <Card>
        <CardHeader>
          <CardTitle>Team Direction</CardTitle>
          <CardDescription>
            Where is your team trying to get to? This is your organization&apos;s shared goal, not any one person&apos;s
            career path.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamDirectionForm
            profile={
              profile
                ? {
                    teamGoals: profile.teamGoals,
                    teamGoalTimeline: profile.teamGoalTimeline,
                    teamGoalsAchievedAt: profile.teamGoalsAchievedAt?.toISOString() ?? null,
                  }
                : null
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
