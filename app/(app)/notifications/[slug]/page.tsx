import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function NotificationDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await auth();
  if (!session) return null;

  const notification = await prisma.notification.findUnique({ where: { slug } });
  if (!notification) notFound();
  if (notification.userId !== session.user.id) redirect("/notifications");

  if (!notification.isRead) {
    await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } });
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Notification</h1>
      <Card>
        <CardContent className="space-y-3 py-4 text-sm">
          <p>{notification.message}</p>
          <p className="text-xs text-muted-foreground">{notification.createdAt.toLocaleString()}</p>
          {notification.link && (
            <Button variant="outline" size="sm" render={<Link href={notification.link} />} nativeButton={false}>
              View
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
