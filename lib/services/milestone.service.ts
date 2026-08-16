import { prisma } from "@/lib/db";

interface MilestoneResult {
  success: boolean;
  error?: string;
}

interface AddMilestoneInput {
  eventId: string;
  requesterId: string;
  title: string;
  amount: number;
}

/**
 * Milestones can be added any time before the first one is paid out — once payouts start,
 * the total is locked (deleting/adding would change what "the rest" should sum to for money
 * that's already partially moved). Amounts don't have to sum to trainingBudget until the
 * first payMilestoneAction call, which validates that and blocks payout otherwise.
 */
export async function addMilestone(input: AddMilestoneInput): Promise<MilestoneResult> {
  const event = await prisma.trainingEvent.findUnique({
    where: { id: input.eventId },
    select: { companyId: true, milestones: { select: { isPaidOut: true } } },
  });
  if (!event) return { success: false, error: "Event not found." };
  if (event.companyId !== input.requesterId) return { success: false, error: "This isn't your event." };
  if (event.milestones.some((m) => m.isPaidOut)) {
    return { success: false, error: "Milestones are locked once the first payout has happened." };
  }

  await prisma.milestone.create({
    data: {
      trainingEventId: input.eventId,
      title: input.title,
      amount: input.amount,
      order: event.milestones.length,
    },
  });

  return { success: true };
}

export async function deleteMilestone(milestoneId: string, requesterId: string): Promise<MilestoneResult> {
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
    select: { isPaidOut: true, trainingEvent: { select: { companyId: true } } },
  });
  if (!milestone) return { success: false, error: "Milestone not found." };
  if (milestone.trainingEvent.companyId !== requesterId) return { success: false, error: "This isn't your event." };
  if (milestone.isPaidOut) return { success: false, error: "This milestone has already been paid out." };

  await prisma.milestone.delete({ where: { id: milestoneId } });
  return { success: true };
}
