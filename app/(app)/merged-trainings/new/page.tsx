import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createMergedTrainingAction } from "@/lib/actions/merged-training.actions";
import { MergedTrainingForm } from "@/components/merged-training/merged-training-form";

export default async function NewMergedTrainingPage() {
  const session = await auth();
  if (session?.user.role !== "EVENT_MANAGER") redirect("/merged-trainings");

  const companies = await prisma.user.findMany({
    where: { role: "EVENT_MANAGER", id: { not: session.user.id } },
    select: { id: true, firstName: true, lastName: true, organization: true },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Start a merged training session</h1>
      <MergedTrainingForm
        action={createMergedTrainingAction}
        submitLabel="Create session"
        invitableCompanies={companies.map((c) => ({
          id: c.id,
          label: c.organization || `${c.firstName} ${c.lastName}`,
        }))}
      />
    </div>
  );
}
