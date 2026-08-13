// Single source of truth for step order, shared by the (app) layout's redirect gate and
// the bare /onboarding index route — both need to resolve "which step should this user
// resume at" without going through each other (avoids chaining two server redirects for
// what should be one hop from the user's perspective).
export const ONBOARDING_STEP_ROUTES = [
  "/onboarding/professional-profile",
  "/onboarding/background",
  "/onboarding/career-direction",
  "/onboarding/learning-preferences",
  "/onboarding/meet-awe",
];

export function resolveOnboardingRoute(step: number): string {
  return ONBOARDING_STEP_ROUTES[step] ?? ONBOARDING_STEP_ROUTES[0];
}
