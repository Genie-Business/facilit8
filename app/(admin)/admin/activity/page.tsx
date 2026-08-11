import type { Metadata } from "next";

import { getRecentActivity, type ActivityType } from "@/lib/services/admin-activity.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Activity",
  robots: { index: false, follow: false },
};

const TYPE_BADGE: Record<ActivityType, { label: string; variant: "secondary" | "outline" | "default" }> = {
  APPLICATION: { label: "Application", variant: "secondary" },
  REVIEW: { label: "Review", variant: "outline" },
  NOTIFICATION: { label: "Notification", variant: "default" },
};

export default async function AdminActivityPage() {
  const activity = await getRecentActivity();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-muted-foreground">
          Recent applications, reviews, and notifications across users — a glance-view, not a full audit log.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent activity</CardTitle>
          <CardDescription>{activity.length} items</CardDescription>
        </CardHeader>
        <CardContent>
          {activity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activity.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Badge variant={TYPE_BADGE[item.type].variant}>{TYPE_BADGE[item.type].label}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">{item.actorName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{item.description}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {item.timestamp.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
