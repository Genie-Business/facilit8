import type { Metadata } from "next";
import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmploymentHistorySection } from "@/components/onboarding/employment-history-section";
import { EducationHistorySection } from "@/components/onboarding/education-history-section";
import { ProfessionalDevelopmentSection } from "@/components/onboarding/professional-development-section";
import { auth } from "@/lib/auth";
import { listEmploymentHistory } from "@/lib/services/employment-history.service";
import { listEducationHistory } from "@/lib/services/education-history.service";
import { listProfessionalDevelopment } from "@/lib/services/professional-development.service";

export const metadata: Metadata = {
  title: "Career Background",
};

export default async function ProfileBackgroundPage() {
  const session = await auth();
  if (!session) return null;

  const userId = session.user.id;
  const [employment, education, professionalDevelopment] = await Promise.all([
    listEmploymentHistory(userId),
    listEducationHistory(userId),
    listProfessionalDevelopment(userId),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/profile" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to profile
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Career Background</h1>
        <p className="text-sm text-muted-foreground">
          Keep your work and education history up to date — this is what Awe uses to understand your career
          progression, not just where you are today.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your history</CardTitle>
          <CardDescription>
            Add anything you've completed since onboarding, including training from outside Facilit8.
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
    </div>
  );
}
