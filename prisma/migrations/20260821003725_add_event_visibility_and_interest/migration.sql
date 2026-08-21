-- CreateEnum
CREATE TYPE "EventVisibility" AS ENUM ('PUBLIC', 'TEAM_ONLY');

-- AlterTable
ALTER TABLE "TrainingEvent" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "EventInterest" (
    "id" TEXT NOT NULL,
    "trainingEventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expressedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventInterest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventInterest_trainingEventId_idx" ON "EventInterest"("trainingEventId");

-- CreateIndex
CREATE UNIQUE INDEX "EventInterest_trainingEventId_userId_key" ON "EventInterest"("trainingEventId", "userId");

-- CreateIndex
CREATE INDEX "TrainingEvent_organizationId_idx" ON "TrainingEvent"("organizationId");

-- AddForeignKey
ALTER TABLE "TrainingEvent" ADD CONSTRAINT "TrainingEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_trainingEventId_fkey" FOREIGN KEY ("trainingEventId") REFERENCES "TrainingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventInterest" ADD CONSTRAINT "EventInterest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
