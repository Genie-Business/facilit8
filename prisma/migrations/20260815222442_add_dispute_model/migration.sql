-- CreateEnum
CREATE TYPE "DisputeTargetType" AS ENUM ('TRAINING_EVENT', 'MERGED_TRAINING_EVENT');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED_REFUNDED', 'RESOLVED_NO_ACTION');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'REFUND';

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL,
    "targetType" "DisputeTargetType" NOT NULL,
    "trainingEventId" TEXT,
    "mergedTrainingEventId" TEXT,
    "raisedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolutionNotes" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dispute_targetType_trainingEventId_idx" ON "Dispute"("targetType", "trainingEventId");

-- CreateIndex
CREATE INDEX "Dispute_targetType_mergedTrainingEventId_idx" ON "Dispute"("targetType", "mergedTrainingEventId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_trainingEventId_fkey" FOREIGN KEY ("trainingEventId") REFERENCES "TrainingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_mergedTrainingEventId_fkey" FOREIGN KEY ("mergedTrainingEventId") REFERENCES "MergedTrainingEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Dispute: exactly one of trainingEventId / mergedTrainingEventId must be set, and it must
-- match targetType. Same pattern as TrainingPayment_target_xor (see
-- 20260808202500_add_check_constraints).
ALTER TABLE "Dispute"
  ADD CONSTRAINT "Dispute_target_xor" CHECK (
    ("targetType" = 'TRAINING_EVENT' AND "trainingEventId" IS NOT NULL AND "mergedTrainingEventId" IS NULL)
    OR
    ("targetType" = 'MERGED_TRAINING_EVENT' AND "mergedTrainingEventId" IS NOT NULL AND "trainingEventId" IS NULL)
  );
