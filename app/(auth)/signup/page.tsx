import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignupForm } from "@/components/auth/signup-form";
import { getBankOptions } from "@/lib/services/bank-list.service";
import { listActiveSkills } from "@/lib/services/skill.service";
import { listOrganizationsForPicker } from "@/lib/services/organization.service";

export const metadata: Metadata = {
  title: "Sign Up",
  description: "Create a Facilit8 account as an Event Manager, Facilitator, or Professional.",
  alternates: { canonical: "/signup" },
};

export default async function SignupPage() {
  const [banks, skills, organizations] = await Promise.all([
    getBankOptions(),
    listActiveSkills(),
    listOrganizationsForPicker(),
  ]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>Join Facilit8 as an Event Manager, Facilitator, or Professional.</CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm banks={banks} skills={skills} organizations={organizations} />
      </CardContent>
    </Card>
  );
}
