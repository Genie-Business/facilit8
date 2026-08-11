import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getAweSubscriptionForUser, getAweTransactionHistory } from "@/lib/services/admin-awe-subscription.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TransactionStatus } from "@/lib/generated/prisma/client";

export const metadata: Metadata = {
  title: "Awe Subscription History",
  robots: { index: false, follow: false },
};

const TRANSACTION_STATUS_BADGE: Record<TransactionStatus, "secondary" | "outline" | "destructive"> = {
  PENDING: "outline",
  SUCCESS: "secondary",
  FAILED: "destructive",
  REVERSED: "destructive",
};

export default async function AdminAweSubscriptionHistoryPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const subscription = await getAweSubscriptionForUser(userId);
  if (!subscription) notFound();

  const transactions = await getAweTransactionHistory(userId);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          {subscription.user.firstName} {subscription.user.lastName}
        </h1>
        <p className="text-muted-foreground">{subscription.user.email} — Awe billing history</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions</CardTitle>
          <CardDescription>{transactions.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No charges recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">₦{Number(tx.amount).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant={TRANSACTION_STATUS_BADGE[tx.status]}>{tx.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{tx.description ?? "—"}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {tx.createdAt.toLocaleString()}
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
