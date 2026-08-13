import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmploymentHistorySection } from "@/components/onboarding/employment-history-section";
import { EducationHistorySection } from "@/components/onboarding/education-history-section";
import { ProfessionalDevelopmentSection } from "@/components/onboarding/professional-development-section";
import { continueFromBackgroundAction } from "@/lib/actions/onboarding.actions";
import { auth } from "@/lib/auth";
import { listEmploymentHistory } from "@/lib/services/employment-history.service";
import { listEducationHistory } from "@/lib/services/education-history.service";
import { listProfessionalDevelopment } from "@/lib/services/professional-development.service";

export default async function BackgroundPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [employment, education, professionalDevelopment] = await Promise.all([
    listEmploymentHistory(userId),
    listEducationHistory(userId),
    listProfessionalDevelopment(userId),
  ]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Your Background</CardTitle>
          <CardDescription>
            Add your work and education history so Awe understands how your career has progressed, not just where
            you are today.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <EmploymentHistorySection
            records={employment.map((r) => ({
              ...r,
              startDate: r.startDate.toISOString(),
              endDate: r.endDate ? r.endDate.toISOString() : null,
            }))}
          />
          <EducationHistorySection
            records={education.map((r) => ({
              ...r,
              startDate: r.startDate.toISOString(),
              endDate: r.endDate ? r.endDate.toISOString() : null,
            }))}
          />
          <ProfessionalDevelopmentSection
            records={professionalDevelopment.map((r) => ({
              ...r,
              dateCompleted: r.dateCompleted.toISOString(),
              expiryDate: r.expiryDate ? r.expiryDate.toISOString() : null,
            }))}
          />
        </CardContent>
      </Card>

      <form action={continueFromBackgroundAction}>
        <Button type="submit">Continue</Button>
      </form>
    </div>
  );
}
