"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Role } from "@/lib/generated/prisma/client";

const INDIVIDUAL_STEPS_1_2 = [
  { href: "/onboarding/background", label: "Your Background" },
  { href: "/onboarding/career-direction", label: "Career Direction" },
];

// Business Event Manager (filled a company name at signup): the org has no personal
// employment history or career, so these two slots become the org's own history/goals.
const BUSINESS_EM_STEPS_1_2 = [
  { href: "/onboarding/team-training", label: "Team Training" },
  { href: "/onboarding/team-direction", label: "Team Direction" },
];

const ROLE_STEP: Record<string, { href: string; label: string } | null> = {
  FACILITATOR: { href: "/onboarding/facilitator-profile", label: "Facilitator Profile" },
  EVENT_MANAGER: { href: "/onboarding/organization-profile", label: "Organization Profile" },
  PROFESSIONAL: null,
};

export function OnboardingProgress({
  role,
  isBusinessEventManager = false,
}: {
  role: Role;
  isBusinessEventManager?: boolean;
}) {
  const pathname = usePathname();
  const roleStep = ROLE_STEP[role];
  const STEPS = [
    { href: "/onboarding/professional-profile", label: "Professional Profile" },
    ...(isBusinessEventManager ? BUSINESS_EM_STEPS_1_2 : INDIVIDUAL_STEPS_1_2),
    { href: "/onboarding/learning-preferences", label: "Learning Preferences" },
    ...(roleStep ? [roleStep] : []),
    { href: "/onboarding/meet-awe", label: "Meet Awé" },
  ];
  const currentIndex = STEPS.findIndex((s) => s.href === pathname);

  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-2 text-xs">
      {STEPS.map((step, i) => {
        const isCurrent = i === currentIndex;
        const isPast = currentIndex >= 0 && i < currentIndex;
        return (
          <li key={step.href} className="flex items-center gap-1">
            <Link
              href={step.href}
              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 whitespace-nowrap transition-colors ${
                isCurrent
                  ? "border-primary bg-primary text-primary-foreground"
                  : isPast
                    ? "border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex size-4 items-center justify-center rounded-full bg-black/10 text-[10px] font-medium">
                {i + 1}
              </span>
              {step.label}
            </Link>
            {i < STEPS.length - 1 && <span className="text-border">→</span>}
          </li>
        );
      })}
    </ol>
  );
}
