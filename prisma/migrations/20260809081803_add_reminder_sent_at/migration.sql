-- AlterTable
ALTER TABLE "MergedTrainingEvent" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TrainingEvent" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);
