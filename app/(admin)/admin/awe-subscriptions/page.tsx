import type { Metadata } from "next";
import Link from "next/link";

import { listAweSubscriptions } from "@/lib/services/admin-awe-subscription.service";
import { cancelAweSubscriptionAction, undoAweSubscriptionCancellationAction } from "@/lib/actions/admin-awe-subscription.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AweSubscriptionStatus } from "@/lib/generated/prisma/client";

export const metadata: Metadata = {
  title: "Awé Subscriptions",
  robots: { index: false, follow: false },
};

const STATUS_BADGE: Record<AweSubscriptionStatus, "secondary" | "outline" | "destructive"> = {
  ACTIVE: "secondary",
  PAST_DUE: "outline",
  CANCELED: "destructive",
};

export default async function AdminAweSubscriptionsPage() {
  const subscriptions = await listAweSubscriptions();
  const now = new Date();

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Awé subscriptions</h1>
        <p className="text-muted-foreground">Manage active Awé subscribers and review billing history.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All subscriptions</CardTitle>
          <CardDescription>{subscriptions.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one has subscribed to Awé yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Failed payments</TableHead>
                  <TableHead>Period ends</TableHead>
                  <TableHead>Auto-renew</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map((sub) => {
                  const canUndo = sub.cancelAtPeriodEnd && sub.currentPeriodEnd > now;
                  return (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="font-medium">
                          {sub.user.firstName} {sub.user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">{sub.user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_BADGE[sub.status]}>{sub.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {sub.pricing?.isFree ? "Free" : sub.pricing ? `₦${Number(sub.pricing.monthlyPrice).toLocaleString()}` : "N/A"}
                      </TableCell>
                      <TableCell>{sub.failedPaymentCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {sub.currentPeriodEnd.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        {sub.cancelAtPeriodEnd ? (
                          <Badge variant="outline">Cancels at period end</Badge>
                        ) : (
                          <Badge variant="secondary">Renews</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            render={<Link href={`/admin/awe-subscriptions/${sub.userId}`} />}
                            nativeButton={false}
                          >
                            View history
                          </Button>
                          {canUndo ? (
                            <form
                              action={async () => {
                                "use server";
                                await undoAweSubscriptionCancellationAction(sub.userId);
                              }}
                            >
                              <Button type="submit" size="sm" variant="outline">
                                Undo cancel
                              </Button>
                            </form>
                          ) : (
                            !sub.cancelAtPeriodEnd && (
                              <form
                                action={async () => {
                                  "use server";
                                  await cancelAweSubscriptionAction(sub.userId);
                                }}
                              >
                                <Button type="submit" size="sm" variant="destructive">
                                  Cancel
                                </Button>
                              </form>
                            )
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
