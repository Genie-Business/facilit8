-- CreateEnum
CREATE TYPE "CoFacilitatorStatus" AS ENUM ('PENDING', 'CONFIRMED', 'DECLINED');

-- CreateTable
CREATE TABLE "MergedTrainingCoFacilitator" (
    "id" TEXT NOT NULL,
    "mergedTrainingEventId" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "status" "CoFacilitatorStatus" NOT NULL DEFAULT 'PENDING',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "MergedTrainingCoFacilitator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MergedTrainingCoFacilitator_mergedTrainingEventId_facilitat_key" ON "MergedTrainingCoFacilitator"("mergedTrainingEventId", "facilitatorId");

-- AddForeignKey
ALTER TABLE "MergedTrainingCoFacilitator" ADD CONSTRAINT "MergedTrainingCoFacilitator_mergedTrainingEventId_fkey" FOREIGN KEY ("mergedTrainingEventId") REFERENCES "MergedTrainingEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MergedTrainingCoFacilitator" ADD CONSTRAINT "MergedTrainingCoFacilitator_facilitatorId_fkey" FOREIGN KEY ("facilitatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
