-- Grandfather in every user who existed before the onboarding wizard shipped: without
-- this, the new (app) layout redirect gate (onboardingCompletedAt IS NULL) would force
-- every existing account into the wizard on their very next page load.
UPDATE "User"
SET "onboardingCompletedAt" = "createdAt"
WHERE "onboardingCompletedAt" IS NULL;
