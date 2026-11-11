import type { NotificationType, PrismaClient } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { pusherTrigger } from "@/lib/pusher/server";
import { userChannel, EVENTS } from "@/lib/pusher/channels";
import { sendEmail } from "@/lib/email/resend";

interface CreateNotificationInput {
  userId: string;
  message: string;
  notificationType: NotificationType;
  link?: string;
  /**
   * Also emails the user, not just the in-app/realtime push. Reserve this for notifications
   * with real financial consequence that fire from a background/async process the user isn't
   * necessarily looking at (payout failures, subscription billing failures) — most
   * notification types shouldn't set this, or every action would double as an email.
   */
  email?: { subject: string; html: string };
}

/**
 * Single write path for notifications: creates the DB row and triggers the realtime push
 * in the same function, using the same channel-name helper the client subscribes to. This
 * is what fixes the old Django app's bug — its publisher and subscriber used two different,
 * independently hand-typed group names, so pushes never actually arrived. See plan §5.
 */
export async function createNotification(
  input: CreateNotificationInput,
  client: Pick<PrismaClient, "notification"> = prisma
): Promise<void> {
  const baseSlug = await generateUniqueSlug(
    input.message,
    async (candidate) => (await prisma.notification.findUnique({ where: { slug: candidate } })) !== null
  );

  // generateUniqueSlug checks and the insert happens after, so two notifications with the same text
  // created at the same moment (several people paid by one payout, say) can both pick the same free
  // slug. The unique index catches that; the loser retries with a random suffix. Only on the shared
  // client — a failed insert would abort a caller's own transaction.
  let notification: Awaited<ReturnType<typeof prisma.notification.create>> | undefined;
  for (let attempt = 0; !notification; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${Math.random().toString(36).slice(2, 8)}`;
    try {
      notification = await client.notification.create({
        data: {
          userId: input.userId,
          message: input.message,
          notificationType: input.notificationType,
          link: input.link,
          slug,
        },
      });
    } catch (err) {
      const slugCollision = typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
      if (!slugCollision || client !== prisma || attempt >= 4) throw err;
    }
  }

  await pusherTrigger(userChannel(input.userId), EVENTS.NOTIFICATION_NEW, {
    id: notification.id,
    slug: notification.slug,
    message: notification.message,
    notificationType: notification.notificationType,
    link: notification.link,
    createdAt: notification.createdAt.toISOString(),
  });

  if (input.email) {
    const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { email: true } });
    if (user) await sendEmail({ to: user.email, subject: input.email.subject, html: input.email.html });
  }
}
