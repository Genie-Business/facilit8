import type { NotificationType, PrismaClient } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/db";
import { generateUniqueSlug } from "@/lib/utils/slug";
import { pusherTrigger } from "@/lib/pusher/server";
import { userChannel, EVENTS } from "@/lib/pusher/channels";

interface CreateNotificationInput {
  userId: string;
  message: string;
  notificationType: NotificationType;
  link?: string;
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
  const slug = await generateUniqueSlug(
    input.message,
    async (candidate) => (await prisma.notification.findUnique({ where: { slug: candidate } })) !== null
  );

  const notification = await client.notification.create({
    data: {
      userId: input.userId,
      message: input.message,
      notificationType: input.notificationType,
      link: input.link,
      slug,
    },
  });

  await pusherTrigger(userChannel(input.userId), EVENTS.NOTIFICATION_NEW, {
    id: notification.id,
    slug: notification.slug,
    message: notification.message,
    notificationType: notification.notificationType,
    link: notification.link,
    createdAt: notification.createdAt.toISOString(),
  });
}
