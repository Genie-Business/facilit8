import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { MergerApplicationForm } from "@/components/merged-training/merger-application-form";

export default async function ApplyToMergedTrainingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session || session.user.role !== "FACILITATOR") redirect(`/merged-trainings/${slug}`);

  const mergedEvent = await prisma.mergedTrainingEvent.findUnique({ where: { slug } });
  if (!mergedEvent) notFound();
  if (mergedEvent.selectedTrainerId) redirect(`/merged-trainings/${slug}`);

  const existing = await prisma.mergerApplication.findUnique({
    where: { trainerId_mergedTrainingEventId: { trainerId: session.user.id, mergedTrainingEventId: mergedEvent.id } },
  });
  if (existing) redirect(`/merged-trainings/${slug}`);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Apply to facilitate &quot;{mergedEvent.title}&quot;</h1>
      <MergerApplicationForm mergedTrainingSlug={mergedEvent.slug} />
    </div>
  );
}
