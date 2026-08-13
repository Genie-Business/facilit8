-- CreateEnum
CREATE TYPE "EmploymentType" AS ENUM ('FULL_TIME', 'PART_TIME', 'CONTRACT', 'FREELANCE', 'INTERNSHIP', 'VOLUNTEER', 'SELF_EMPLOYED');

-- CreateEnum
CREATE TYPE "ProfessionalDevelopmentType" AS ENUM ('COURSE', 'TRAINING', 'CERTIFICATION', 'WORKSHOP', 'CONFERENCE');

-- CreateEnum
CREATE TYPE "ProfessionalDevelopmentSource" AS ENUM ('MANUAL', 'FACILIT8_AUTO');

-- AlterTable
ALTER TABLE "AweCareerProfile" ADD COLUMN     "availableLearningTime" TEXT,
ADD COLUMN     "careerGoalTags" TEXT[],
ADD COLUMN     "certifications" TEXT[],
ADD COLUMN     "challengeOther" TEXT,
ADD COLUMN     "challengeTags" TEXT[],
ADD COLUMN     "highestEducationLevel" TEXT,
ADD COLUMN     "languagesSpoken" TEXT[],
ADD COLUMN     "learningFormats" TEXT[],
ADD COLUMN     "longTermAmbition" TEXT,
ADD COLUMN     "preferredDelivery" TEXT,
ADD COLUMN     "preferredSchedule" TEXT[],
ADD COLUMN     "professionalMemberships" TEXT[],
ADD COLUMN     "skillsToAcquire" TEXT[],
ADD COLUMN     "skillsToImprove" TEXT[],
ADD COLUMN     "targetCareerLevel" TEXT,
ADD COLUMN     "targetTimeline" TEXT,
ADD COLUMN     "tellAweText" TEXT,
ADD COLUMN     "topStrengths" TEXT[],
ADD COLUMN     "weakSkills" TEXT[];

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3),
ADD COLUMN     "onboardingStep" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EmploymentHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "jobTitle" TEXT NOT NULL,
    "industry" TEXT,
    "employmentType" "EmploymentType" NOT NULL,
    "location" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "responsibilities" TEXT,
    "achievements" TEXT,
    "skillsDeveloped" TEXT[],
    "majorProjects" TEXT,
    "teamSize" INTEGER,
    "reasonForLeaving" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmploymentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EducationHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "qualification" TEXT NOT NULL,
    "fieldOfStudy" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "grade" TEXT,
    "relevantCoursework" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EducationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfessionalDevelopment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ProfessionalDevelopmentType" NOT NULL,
    "title" TEXT NOT NULL,
    "provider" TEXT,
    "dateCompleted" TIMESTAMP(3) NOT NULL,
    "skillsAcquired" TEXT[],
    "expiryDate" TIMESTAMP(3),
    "source" "ProfessionalDevelopmentSource" NOT NULL DEFAULT 'MANUAL',
    "relatedTrainingEventId" TEXT,
    "relatedMergedTrainingEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfessionalDevelopment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmploymentHistory_userId_idx" ON "EmploymentHistory"("userId");

-- CreateIndex
CREATE INDEX "EducationHistory_userId_idx" ON "EducationHistory"("userId");

-- CreateIndex
CREATE INDEX "ProfessionalDevelopment_userId_idx" ON "ProfessionalDevelopment"("userId");

-- AddForeignKey
ALTER TABLE "EmploymentHistory" ADD CONSTRAINT "EmploymentHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EducationHistory" ADD CONSTRAINT "EducationHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfessionalDevelopment" ADD CONSTRAINT "ProfessionalDevelopment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
