import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function NotificationsPage() {
  const session = await auth();
  if (!session) return null;

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Notifications</h1>

      {notifications.length === 0 && <p className="text-muted-foreground">No notifications yet.</p>}

      <div className="space-y-2">
        {notifications.map((notification) => (
          <Link key={notification.id} href={`/notifications/${notification.slug}`}>
            <Card className={notification.isRead ? "opacity-70" : undefined}>
              <CardContent className="flex items-center justify-between gap-4 py-3">
                <div>
                  <p className="text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {notification.createdAt.toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!notification.isRead && <Badge variant="secondary">New</Badge>}
                  <Badge variant="outline">{notification.notificationType}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
