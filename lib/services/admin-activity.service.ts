import { prisma } from "@/lib/db";

export type ActivityType = "APPLICATION" | "REVIEW" | "NOTIFICATION";

export interface ActivityItem {
  id: string;
  type: ActivityType;
  timestamp: Date;
  actorName: string;
  description: string;
}

const userSelect = { id: true, firstName: true, lastName: true, email: true } as const;

function fullName(user: { firstName: string; lastName: string }): string {
  return `${user.firstName} ${user.lastName}`;
}

/**
 * Merged glance-feed over existing data — not a real audit log. No pagination; approximate
 * at the tail since each source is independently capped at `limit` before merging.
 */
export async function getRecentActivity(limit = 50): Promise<ActivityItem[]> {
  const [applications, reviews, notifications] = await Promise.all([
    prisma.application.findMany({
      take: limit,
      orderBy: { appliedAt: "desc" },
      include: { trainer: { select: userSelect }, trainingEvent: { select: { title: true } } },
    }),
    prisma.review.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        reviewer: { select: userSelect },
        reviewee: { select: userSelect },
        trainingEvent: { select: { title: true } },
      },
    }),
    prisma.notification.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { user: { select: userSelect } },
    }),
  ]);

  const items: ActivityItem[] = [
    ...applications.map((application) => ({
      id: `application-${application.id}`,
      type: "APPLICATION" as const,
      timestamp: application.appliedAt,
      actorName: fullName(application.trainer),
      description: `Applied to "${application.trainingEvent.title}"`,
    })),
    ...reviews.map((review) => ({
      id: `review-${review.id}`,
      type: "REVIEW" as const,
      timestamp: review.createdAt,
      actorName: fullName(review.reviewer),
      description: `Left a ${review.rating}★ review for ${fullName(review.reviewee)} on "${review.trainingEvent.title}"`,
    })),
    ...notifications.map((notification) => ({
      id: `notification-${notification.id}`,
      type: "NOTIFICATION" as const,
      timestamp: notification.createdAt,
      actorName: fullName(notification.user),
      description: notification.message,
    })),
  ];

  return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}
