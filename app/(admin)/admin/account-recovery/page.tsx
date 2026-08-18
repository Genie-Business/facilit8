import type { Metadata } from "next";

import { listUsersNeedingRecovery } from "@/lib/services/account-recovery.service";
import { sendRecoveryEmailAction, sendAllRecoveryEmailsAction } from "@/lib/actions/admin-account-recovery.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = {
  title: "Account Recovery",
  robots: { index: false, follow: false },
};

export default async function AdminAccountRecoveryPage() {
  const users = await listUsersNeedingRecovery();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Account recovery</h1>
          <p className="text-muted-foreground">
            Users whose Anchor wallet setup never finished: customer creation failed outright, or it stalled
            silently because no withdrawal bank account was ever collected. Sending an email lets them confirm
            their bank details and complete setup themselves.
          </p>
        </div>
        {users.length > 0 && (
          <form action={sendAllRecoveryEmailsAction}>
            <Button type="submit" variant="outline">
              Send to all ({users.length})
            </Button>
          </form>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Affected users</CardTitle>
          <CardDescription>{users.length} total</CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No one currently needs account recovery.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Issue</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const pendingToken = user.accountRecoveryTokens[0];
                  const issue = !user.anchorCustomerId
                    ? "Customer creation failed"
                    : !user.anchorCounterpartyId
                      ? "No withdrawal bank account on file"
                      : "Provisioning failed";

                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="font-medium">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.role}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {issue}
                        {user.vaFailureReason && <div className="text-xs">{user.vaFailureReason}</div>}
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={sendRecoveryEmailAction.bind(null, user.id)}>
                          <Button type="submit" size="sm" variant="outline">
                            {pendingToken ? "Resend email" : "Send recovery email"}
                          </Button>
                        </form>
                        {pendingToken && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Sent {pendingToken.createdAt.toLocaleDateString()}
                          </p>
                        )}
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
