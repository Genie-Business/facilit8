import type { Role } from "@/lib/generated/prisma/client";

// Single source of truth for step order, shared by the (app) layout's redirect gate and
// the bare /onboarding index route — both need to resolve "which step should this user
// resume at" without going through each other (avoids chaining two server redirects for
// what should be one hop from the user's perspective).
//
// Steps 0-3 are common to every role. Step 4 is role-specific (Facilitator profile /
// Organization profile) and is skipped entirely for PROFESSIONAL, whose step 3
// (learning-preferences) advances straight to step 5. Step 5 is always "meet Awe".
const COMMON_STEP_ROUTES = [
  "/onboarding/professional-profile",
  "/onboarding/background",
  "/onboarding/career-direction",
  "/onboarding/learning-preferences",
];

const MEET_AWE_ROUTE = "/onboarding/meet-awe";

export function resolveOnboardingRoute(step: number, role: Role): string {
  if (step >= 0 && step < COMMON_STEP_ROUTES.length) return COMMON_STEP_ROUTES[step];
  if (step === COMMON_STEP_ROUTES.length) {
    if (role === "FACILITATOR") return "/onboarding/facilitator-profile";
    if (role === "EVENT_MANAGER") return "/onboarding/organization-profile";
    return MEET_AWE_ROUTE; // PROFESSIONAL has no role-specific step
  }
  return MEET_AWE_ROUTE;
}

/** The step number to advance to once learning-preferences (step 3) is done — skips the
 * role-specific slot entirely for PROFESSIONAL, since there's nothing to show them there. */
export function stepAfterLearningPreferences(role: Role): number {
  return role === "PROFESSIONAL" ? COMMON_STEP_ROUTES.length + 1 : COMMON_STEP_ROUTES.length;
}

/** The step number to record once the role-specific step completes (or is skipped). */
export const MEET_AWE_STEP = COMMON_STEP_ROUTES.length + 1;
