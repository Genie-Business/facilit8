import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BackLink } from "@/components/onboarding/back-link";
import { MeetAweForm } from "@/components/onboarding/meet-awe-form";
import { auth } from "@/lib/auth";
import { getCareerProfile } from "@/lib/services/awe-career-profile.service";

const PREVIOUS_STEP_ROUTE: Record<string, string> = {
  FACILITATOR: "/onboarding/facilitator-profile",
  EVENT_MANAGER: "/onboarding/organization-profile",
  PROFESSIONAL: "/onboarding/learning-preferences",
};

export default async function MeetAwePage() {
  const session = await auth();
  const profile = await getCareerProfile(session!.user.id);
  const backHref = PREVIOUS_STEP_ROUTE[session!.user.role] ?? "/onboarding/learning-preferences";

  return (
    <div className="space-y-4">
      <BackLink href={backHref} />
      <Card>
        <CardHeader>
          <CardTitle>Meet Awé</CardTitle>
          <CardDescription>
            Awé is Facilit8's AI career and professional growth partner. Everything you just shared feeds directly
            into how Awé understands you, but structured fields can't capture everything. Tell Awé about your
            professional journey in your own words.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MeetAweForm defaultValue={profile?.tellAweText ?? ""} />
        </CardContent>
      </Card>
    </div>
  );
}
