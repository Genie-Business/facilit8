import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/services/notification.service";
import { sendEmail } from "@/lib/email/resend";

const REMINDER_WINDOW_START_MS = 24 * 60 * 60 * 1000;
const REMINDER_WINDOW_END_MS = 3 * 24 * 60 * 60 * 1000;

function reminderEmailHtml(title: string, startDate: Date, location: string): string {
  return `
    <p>This is a reminder that <strong>${title}</strong> starts on
    ${startDate.toLocaleDateString("en-NG", { dateStyle: "long" })} at ${location}.</p>
  `;
}

async function notifyReminder(userId: string, email: string, message: string, link: string, title: string, startDate: Date, location: string) {
  await createNotification({ userId, notificationType: "EVENT_REMINDER", message, link });
  await sendEmail({ to: email, subject: `Reminder: ${title}`, html: reminderEmailHtml(title, startDate, location) });
}

/**
 * Replaces the old Django `send_event_reminders` management command, which referenced
 * nonexistent fields and was never runnable. Dedup is via `reminderSentAt` (set once per
 * event) rather than the old command's lack of any dedup at all.
 */
export async function sendEventReminders(): Promise<{ trainingEvents: number; mergedTrainingEvents: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + REMINDER_WINDOW_START_MS);
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_END_MS);

  const trainingEvents = await prisma.trainingEvent.findMany({
    where: {
      reminderSentAt: null,
      approval: "APPROVED",
      isCompleted: false,
      startDate: { gte: windowStart, lte: windowEnd },
    },
    include: { company: true, selectedTrainer: true },
  });

  for (const event of trainingEvents) {
    const link = `/events/${event.slug}`;
    await notifyReminder(
      event.company.id,
      event.company.email,
      `Upcoming: "${event.title}" starts soon.`,
      link,
      event.title,
      event.startDate,
      event.location
    );
    if (event.selectedTrainer) {
      await notifyReminder(
        event.selectedTrainer.id,
        event.selectedTrainer.email,
        `Upcoming: "${event.title}" starts soon.`,
        link,
        event.title,
        event.startDate,
        event.location
      );
    }
    await prisma.trainingEvent.update({ where: { id: event.id }, data: { reminderSentAt: now } });
  }

  const mergedTrainingEvents = await prisma.mergedTrainingEvent.findMany({
    where: {
      reminderSentAt: null,
      cancelled: false,
      isCompleted: false,
      startDate: { gte: windowStart, lte: windowEnd },
    },
    include: {
      initiator: true,
      selectedTrainer: true,
      participants: { where: { hasPaid: true }, include: { company: true } },
    },
  });

  for (const event of mergedTrainingEvents) {
    const link = `/merged-trainings/${event.slug}`;
    const recipients = new Map<string, string>();
    recipients.set(event.initiator.id, event.initiator.email);
    if (event.selectedTrainer) recipients.set(event.selectedTrainer.id, event.selectedTrainer.email);
    for (const participant of event.participants) {
      recipients.set(participant.company.id, participant.company.email);
    }

    for (const [userId, email] of recipients) {
      await notifyReminder(
        userId,
        email,
        `Upcoming: "${event.title}" starts soon.`,
        link,
        event.title,
        event.startDate,
        event.location
      );
    }
    await prisma.mergedTrainingEvent.update({ where: { id: event.id }, data: { reminderSentAt: now } });
  }

  return { trainingEvents: trainingEvents.length, mergedTrainingEvents: mergedTrainingEvents.length };
}
