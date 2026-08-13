import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { resolveOnboardingRoute } from "@/lib/onboarding/steps";

export default async function OnboardingIndexPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { onboardingStep: true, onboardingCompletedAt: true },
  });

  if (user?.onboardingCompletedAt) redirect("/dashboard");
  redirect(resolveOnboardingRoute(user?.onboardingStep ?? 0));
}
