import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfessionalProfileForm } from "@/components/onboarding/professional-profile-form";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getCareerProfile } from "@/lib/services/awe-career-profile.service";
import { listActiveSkills } from "@/lib/services/skill.service";

export default async function ProfessionalProfilePage() {
  const session = await auth();
  const userId = session!.user.id;

  const [user, profile, skills] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { profileImageUrl: true } }),
    getCareerProfile(userId),
    listActiveSkills(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Professional Profile</CardTitle>
        <CardDescription>
          Tell us about where you are today — this is the context Awe uses to make recommendations that actually
          fit your career.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ProfessionalProfileForm
          profileImageUrl={user?.profileImageUrl ?? null}
          profile={profile}
          skills={skills.map((s) => ({ id: s.id, name: s.name }))}
          selectedSkillIds={profile?.skills.map((s) => s.skillId) ?? []}
        />
      </CardContent>
    </Card>
  );
}
