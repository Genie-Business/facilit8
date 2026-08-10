export interface MergedTrainingStageInput {
  isInviteOnly: boolean;
  totalSlots: number;
  isFullyFunded: boolean;
  selectedTrainerId: string | null;
  isCompleted: boolean;
  cancelled: boolean;
  invites: { companyId: string }[];
  participants: { companyId: string; numDelegates: number }[];
}

export interface MergedTrainingStage {
  key: string;
  label: string;
  complete: boolean;
}

export interface MergedTrainingProgress {
  stages: MergedTrainingStage[];
  currentIndex: number;
}

/**
 * Five-stage lifecycle shown to every invitee/participant: Pooling candidates → Deciding
 * training date → Funding → Selecting facilitator → Training concluded. Each stage's
 * completion is a group condition, not a per-user one — it only flips once every invitee
 * (or, for public non-invite sessions, every reserved slot) satisfies it.
 */
export function mergedTrainingProgress(event: MergedTrainingStageInput): MergedTrainingProgress {
  const reservedSlots = event.participants.reduce((sum, p) => sum + p.numDelegates, 0);

  const poolingComplete = event.isInviteOnly
    ? event.invites.length > 0 &&
      event.invites.every((invite) => event.participants.some((p) => p.companyId === invite.companyId))
    : reservedSlots >= event.totalSlots;

  // The training window is fixed by the initiator at creation — every invitee is presented
  // the same date up front, so there's no separate per-invitee confirmation step today.
  const dateDecided = true;

  const stages: MergedTrainingStage[] = [
    { key: "pooling", label: "Pooling candidates", complete: poolingComplete },
    { key: "date", label: "Deciding training date", complete: dateDecided },
    { key: "funding", label: "Funding", complete: event.isFullyFunded },
    { key: "facilitator", label: "Selecting facilitator", complete: event.selectedTrainerId !== null },
    { key: "concluded", label: "Training concluded", complete: event.isCompleted },
  ];

  const currentIndex = stages.findIndex((stage) => !stage.complete);

  return { stages, currentIndex: currentIndex === -1 ? stages.length - 1 : currentIndex };
}
