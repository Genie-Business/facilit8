"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STEPS = [
  { href: "/onboarding/professional-profile", label: "Professional Profile" },
  { href: "/onboarding/background", label: "Your Background" },
  { href: "/onboarding/career-direction", label: "Career Direction" },
  { href: "/onboarding/learning-preferences", label: "Learning Preferences" },
  { href: "/onboarding/meet-awe", label: "Meet Awe" },
];

export function OnboardingProgress() {
  const pathname = usePathname();
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
