import { prisma } from "@/lib/db";
import { createNotification } from "./notification.service";

const NUDGE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const NEW_EVENT_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Rule-based, not LLM-driven: reuses the career profile's own skillsToAcquire tags (already
 * collected in onboarding/Awe conversations) against newly-opened training, so this costs a
 * handful of DB queries per daily run rather than an LLM call per user. A user is nudged at
 * most once a week (NUDGE_COOLDOWN_MS) even if multiple qualifying events show up, so this
 * stays a useful signal rather than daily spam.
 */
export async function sendAweTrainingMatchNudges(): Promise<{ nudged: number }> {
  const cooldownCutoff = new Date(Date.now() - NUDGE_COOLDOWN_MS);
  const newEventCutoff = new Date(Date.now() - NEW_EVENT_WINDOW_MS);

  const profiles = await prisma.aweCareerProfile.findMany({
    where: { skillsToAcquire: { isEmpty: false } },
    select: { userId: true, skillsToAcquire: true },
  });
  if (profiles.length === 0) return { nudged: 0 };

  const recentEvents = await prisma.trainingEvent.findMany({
    where: { approval: "APPROVED", isAvailable: true, createdAt: { gte: newEventCutoff } },
    select: { title: true, slug: true, skillType: true },
  });
  if (recentEvents.length === 0) return { nudged: 0 };

  let nudged = 0;
  for (const profile of profiles) {
    const match = recentEvents.find((event) =>
      profile.skillsToAcquire.some((skill) => event.skillType.toLowerCase().includes(skill.toLowerCase()))
    );
    if (!match) continue;

    const recentlyNudged = await prisma.notification.findFirst({
      where: { userId: profile.userId, notificationType: "AWE_TRAINING_MATCH", createdAt: { gte: cooldownCutoff } },
    });
    if (recentlyNudged) continue;

    await createNotification({
      userId: profile.userId,
      notificationType: "AWE_TRAINING_MATCH",
      message: `Awé found new training matching a skill you're working on: "${match.title}".`,
      link: `/events/${match.slug}`,
    });
    nudged++;
  }

  return { nudged };
}
