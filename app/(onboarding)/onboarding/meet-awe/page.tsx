import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MeetAweForm } from "@/components/onboarding/meet-awe-form";
import { auth } from "@/lib/auth";
import { getCareerProfile } from "@/lib/services/awe-career-profile.service";

export default async function MeetAwePage() {
  const session = await auth();
  const profile = await getCareerProfile(session!.user.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meet Awe</CardTitle>
        <CardDescription>
          Awe is Facilit8's AI career and professional growth partner. Everything you just shared feeds directly
          into how Awe understands you — but structured fields can't capture everything. Tell Awe about your
          professional journey in your own words.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <MeetAweForm defaultValue={profile?.tellAweText ?? ""} />
      </CardContent>
    </Card>
  );
}
