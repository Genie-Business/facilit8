-- CreateEnum
CREATE TYPE "FacilitationSkillName" AS ENUM ('PUBLIC_SPEAKING', 'FACILITATION', 'ADULT_LEARNING', 'INSTRUCTIONAL_DESIGN', 'WORKSHOP_DESIGN', 'STORYTELLING', 'EXECUTIVE_FACILITATION', 'VIRTUAL_FACILITATION', 'TRAINING_EVALUATION', 'PRESENTATION', 'COACHING', 'CONSULTING');

-- CreateEnum
CREATE TYPE "ProficiencyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateTable
CREATE TABLE "FacilitatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "yearsFacilitating" INTEGER,
    "sessionsDelivered" INTEGER,
    "delegatesTrained" INTEGER,
    "typicalAudienceSize" TEXT,
    "typicalAudienceSeniority" TEXT,
    "trainingFormats" TEXT[],
    "industriesServed" TEXT[],
    "canTrainNow" TEXT[],
    "wantToTrain" TEXT[],
    "facilitatorGoals" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilitatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FacilitationSkillRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skill" "FacilitationSkillName" NOT NULL,
    "proficiency" "ProficiencyLevel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FacilitationSkillRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationProfile" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "organizationType" TEXT,
    "website" TEXT,
    "employeeCountBand" TEXT,
    "locations" TEXT[],
    "yearEstablished" INTEGER,
    "departments" TEXT[],
    "workforceLevels" TEXT[],
    "trainingNeeds" TEXT[],
    "workforceChallenges" TEXT[],
    "preferredFormat" TEXT,
    "preferredLocation" TEXT,
    "preferredSchedule" TEXT[],
    "trainingFrequency" TEXT,
    "typicalDuration" TEXT,
    "typicalClassSize" TEXT,
    "budgetRange" TEXT,
    "budgetCurrency" TEXT NOT NULL DEFAULT 'NGN',
    "typicalAudience" TEXT,
    "strategicInitiatives" TEXT[],
    "skillsNeeded" TEXT[],
    "biggestChallenge" TEXT,
    "learningCulture" TEXT,
    "participationBarriers" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FacilitatorProfile_userId_key" ON "FacilitatorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FacilitationSkillRating_userId_skill_key" ON "FacilitationSkillRating"("userId", "skill");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationProfile_organizationId_key" ON "OrganizationProfile"("organizationId");

-- AddForeignKey
ALTER TABLE "FacilitatorProfile" ADD CONSTRAINT "FacilitatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FacilitationSkillRating" ADD CONSTRAINT "FacilitationSkillRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationProfile" ADD CONSTRAINT "OrganizationProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
