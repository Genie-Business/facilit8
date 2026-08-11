import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { createMergedTrainingAction } from "@/lib/actions/merged-training.actions";
import { getInviteGroupsForInitiator } from "@/lib/services/merged-training-invite-candidates";
import { MergedTrainingForm } from "@/components/merged-training/merged-training-form";

const CREATOR_ROLES = ["EVENT_MANAGER", "PROFESSIONAL", "FACILITATOR"] as const;

export default async function NewMergedTrainingPage() {
  const session = await auth();
  if (!session || !CREATOR_ROLES.includes(session.user.role as (typeof CREATOR_ROLES)[number])) {
    redirect("/merged-trainings");
  }

  const role = session.user.role as (typeof CREATOR_ROLES)[number];
  const inviteGroups = await getInviteGroupsForInitiator(role, session.user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Start a merged training session</h1>
      <MergedTrainingForm
        action={createMergedTrainingAction}
        submitLabel="Create session"
        inviteGroups={inviteGroups}
        hideInitiatorDelegates={role === "FACILITATOR"}
      />
    </div>
  );
}
