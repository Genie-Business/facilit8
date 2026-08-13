import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LearningPreferencesForm } from "@/components/onboarding/learning-preferences-form";
import { auth } from "@/lib/auth";
import { getCareerProfile } from "@/lib/services/awe-career-profile.service";

export default async function LearningPreferencesPage() {
  const session = await auth();
  const profile = await getCareerProfile(session!.user.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Preferences</CardTitle>
        <CardDescription>How, when, and where do you learn best?</CardDescription>
      </CardHeader>
      <CardContent>
        <LearningPreferencesForm profile={profile} />
      </CardContent>
    </Card>
  );
}
