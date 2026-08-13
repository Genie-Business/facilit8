import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FacilitatorProfileForm } from "@/components/onboarding/facilitator-profile-form";
import { auth } from "@/lib/auth";
import { getFacilitatorProfile, getFacilitationSkillRatings } from "@/lib/services/facilitator-profile.service";

export default async function FacilitatorProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [profile, skillRatings] = await Promise.all([
    getFacilitatorProfile(userId),
    getFacilitationSkillRatings(userId),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Facilitator Profile</CardTitle>
        <CardDescription>
          Tell Awe about your facilitation track record and craft so it can match you to the right
          opportunities and coach you toward the ones you're not ready for yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FacilitatorProfileForm
          profile={profile}
          skillRatings={Object.fromEntries(skillRatings.map((r) => [r.skill, r.proficiency]))}
        />
      </CardContent>
    </Card>
  );
}
