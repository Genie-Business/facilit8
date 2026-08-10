-- CreateEnum
CREATE TYPE "AweSubscriptionStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "AweMessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'AWE_SUBSCRIPTION_RENEWED';
ALTER TYPE "NotificationType" ADD VALUE 'AWE_SUBSCRIPTION_PAYMENT_FAILED';

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'AWE_SUBSCRIPTION';

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "relatedAweSubscriptionId" TEXT;

-- CreateTable
CREATE TABLE "AwePricing" (
    "id" TEXT NOT NULL,
    "monthlyPrice" DECIMAL(14,2) NOT NULL,
    "durationDays" INTEGER NOT NULL DEFAULT 30,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AwePricing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AweSubscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "AweSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "pricingId" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "nextBillingAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "failedPaymentCount" INTEGER NOT NULL DEFAULT 0,
    "lastPaymentFailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AweSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AweConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AweConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AweMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "AweMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "toolCalls" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AweMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AweCareerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentRole" TEXT,
    "industry" TEXT,
    "yearsExperience" INTEGER,
    "currentEmployer" TEXT,
    "targetRole" TEXT,
    "targetIndustry" TEXT,
    "careerGoals" TEXT,
    "strengths" TEXT,
    "developmentAreas" TEXT,
    "preferredLearningStyle" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AweCareerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AweCareerProfileSkill" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "proficiency" TEXT,

    CONSTRAINT "AweCareerProfileSkill_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AweSubscription_userId_key" ON "AweSubscription"("userId");

-- CreateIndex
CREATE INDEX "AweSubscription_status_nextBillingAt_idx" ON "AweSubscription"("status", "nextBillingAt");

-- CreateIndex
CREATE INDEX "AweConversation_userId_updatedAt_idx" ON "AweConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AweMessage_conversationId_createdAt_idx" ON "AweMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AweCareerProfile_userId_key" ON "AweCareerProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AweCareerProfileSkill_profileId_skillId_key" ON "AweCareerProfileSkill"("profileId", "skillId");

-- AddForeignKey
ALTER TABLE "AweSubscription" ADD CONSTRAINT "AweSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AweSubscription" ADD CONSTRAINT "AweSubscription_pricingId_fkey" FOREIGN KEY ("pricingId") REFERENCES "AwePricing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AweConversation" ADD CONSTRAINT "AweConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AweMessage" ADD CONSTRAINT "AweMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AweConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AweCareerProfile" ADD CONSTRAINT "AweCareerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AweCareerProfileSkill" ADD CONSTRAINT "AweCareerProfileSkill_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AweCareerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AweCareerProfileSkill" ADD CONSTRAINT "AweCareerProfileSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;
