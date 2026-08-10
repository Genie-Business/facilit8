import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/services/notification.service";

/**
 * Single funding-check code path, called from every trigger point (participant payment
 * confirmation). Fixes Django's mergerTraining app, which had this same check duplicated
 * in two places — a signal handler that was never actually connected (missing from
 * apps.py's ready()), and an inline copy inside the payment-confirmation view that was the
 * only one that actually ran.
 */
export async function checkAndUpdateFundingStatus(mergedTrainingEventId: string): Promise<void> {
  const session = await prisma.mergedTrainingEvent.findUnique({
    where: { id: mergedTrainingEventId },
    include: { participants: true },
  });
  if (!session || session.isFullyFunded || session.cancelled) return;

  const fundedSlots = session.participants
    .filter((p) => p.hasPaid)
    .reduce((sum, p) => sum + p.numDelegates, 0);

  if (fundedSlots < session.totalSlots) return;

  await prisma.mergedTrainingEvent.update({
    where: { id: session.id },
    data: { isFullyFunded: true, approval: "APPROVED", paymentConfirmed: true },
  });

  for (const participant of session.participants) {
    await createNotification({
      userId: participant.companyId,
      notificationType: "MERGED_TRAINING_FUNDED",
      message: `"${session.title}" is now fully funded.`,
      link: `/merged-trainings/${session.slug}`,
    });
  }
}
