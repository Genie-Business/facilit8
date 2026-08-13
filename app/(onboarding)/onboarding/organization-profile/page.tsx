import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/onboarding/back-link";
import { OrganizationProfileForm } from "@/components/onboarding/organization-profile-form";
import { auth } from "@/lib/auth";
import { getUserOrganizationMembership } from "@/lib/services/organization.service";
import { getOrganizationProfile } from "@/lib/services/organization-profile.service";

export default async function OrganizationProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const membership = await getUserOrganizationMembership(userId);
  const profile = membership ? await getOrganizationProfile(membership.organizationId) : null;

  return (
    <div className="space-y-4">
      <BackLink href="/onboarding/learning-preferences" />
      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
          <CardDescription>
            {membership
              ? `Tell Awe about ${membership.organization.name}'s workforce and training needs — this is shared across everyone on your team.`
              : "You're not affiliated with an organization yet. Add one from your profile, then come back to this step."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationProfileForm profile={profile} disabled={!membership} />
        </CardContent>
      </Card>
    </div>
  );
}
