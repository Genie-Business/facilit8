-- CreateTable
CREATE TABLE "CronRun" (
    "jobName" TEXT NOT NULL,
    "lastRunAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CronRun_pkey" PRIMARY KEY ("jobName")
);
