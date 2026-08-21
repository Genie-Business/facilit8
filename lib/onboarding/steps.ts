import type { Role } from "@/lib/generated/prisma/client";

// Single source of truth for step order, shared by the (app) layout's redirect gate and
// the bare /onboarding index route — both need to resolve "which step should this user
// resume at" without going through each other (avoids chaining two server redirects for
// what should be one hop from the user's perspective).
//
// Steps 0 and 3 are identical for everyone. Steps 1 and 2 fork for a *business* Event
// Manager (filled a company name at signup — see User.organization): step 1 becomes
// "Trainings for staff" instead of personal Employment History (the org itself has no
// employment history — that belongs to individual employees who join later via invite),
// and step 2 becomes "Team Direction" instead of personal Career Direction. Step 4 is
// role-specific (Facilitator profile / Organization profile — same for business and
// individual EMs) and is skipped entirely for PROFESSIONAL, whose step 3
// (learning-preferences) advances straight to step 5. Step 5 is always "meet Awe".
const MEET_AWE_ROUTE = "/onboarding/meet-awe";
const STEP_COUNT = 4; // steps 0-3, before the role-specific slot at step 4

export function resolveOnboardingRoute(step: number, role: Role, isBusinessEventManager = false): string {
  if (step === 0) return "/onboarding/professional-profile";
  if (step === 1) return isBusinessEventManager ? "/onboarding/team-training" : "/onboarding/background";
  if (step === 2) return isBusinessEventManager ? "/onboarding/team-direction" : "/onboarding/career-direction";
  if (step === 3) return "/onboarding/learning-preferences";
  if (step === STEP_COUNT) {
    if (role === "FACILITATOR") return "/onboarding/facilitator-profile";
    if (role === "EVENT_MANAGER") return "/onboarding/organization-profile";
    return MEET_AWE_ROUTE; // PROFESSIONAL has no role-specific step
  }
  return MEET_AWE_ROUTE;
}

/** The step number to advance to once learning-preferences (step 3) is done — skips the
 * role-specific slot entirely for PROFESSIONAL, since there's nothing to show them there. */
export function stepAfterLearningPreferences(role: Role): number {
  return role === "PROFESSIONAL" ? STEP_COUNT + 1 : STEP_COUNT;
}

/** The step number to record once the role-specific step completes (or is skipped). */
export const MEET_AWE_STEP = STEP_COUNT + 1;
