import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { skipOnboardingAction } from "@/lib/actions/onboarding.actions";

export const metadata: Metadata = {
  title: "Set up your profile",
  robots: { index: false, follow: false },
};

// Per-user, always-fresh (progress cursor, existing records) — never worth prerendering.
export const dynamic = "force-dynamic";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/">
            <Image src="/brand/logo.png" alt="Facilit8" width={120} height={60} priority />
          </Link>
          <form action={skipOnboardingAction}>
            <Button type="submit" variant="ghost" size="sm">
              Skip for now
            </Button>
          </form>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <OnboardingProgress />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
