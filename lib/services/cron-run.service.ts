import { prisma } from "@/lib/db";

export async function recordCronRun(jobName: string): Promise<void> {
  await prisma.cronRun.upsert({
    where: { jobName },
    create: { jobName, lastRunAt: new Date() },
    update: { lastRunAt: new Date() },
  });
}

export async function getCronRunStatus(jobName: string, expectedIntervalMs: number) {
  const run = await prisma.cronRun.findUnique({ where: { jobName } });
  if (!run) return { lastRunAt: null, isStale: true };

  const isStale = Date.now() - run.lastRunAt.getTime() > expectedIntervalMs * 1.5;
  return { lastRunAt: run.lastRunAt, isStale };
}
