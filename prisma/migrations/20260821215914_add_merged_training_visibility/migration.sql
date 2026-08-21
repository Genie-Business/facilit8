-- AlterTable
ALTER TABLE "MergedTrainingEvent" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "visibility" "EventVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateIndex
CREATE INDEX "MergedTrainingEvent_organizationId_idx" ON "MergedTrainingEvent"("organizationId");

-- AddForeignKey
ALTER TABLE "MergedTrainingEvent" ADD CONSTRAINT "MergedTrainingEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
