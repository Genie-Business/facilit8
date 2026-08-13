import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CareerDirectionForm } from "@/components/onboarding/career-direction-form";
import { auth } from "@/lib/auth";
import { getCareerProfile } from "@/lib/services/awe-career-profile.service";

export default async function CareerDirectionPage() {
  const session = await auth();
  const profile = await getCareerProfile(session!.user.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Career Direction</CardTitle>
        <CardDescription>
          Where are you trying to get to, and what's in the way? This is the single most useful input for Awe's
          recommendations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <CareerDirectionForm profile={profile} />
      </CardContent>
    </Card>
  );
}
