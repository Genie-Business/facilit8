import type { Metadata } from "next";

import { listUsersNeedingRecovery } from "@/lib/services/account-recovery.service";
import { findUserAnchorState } from "@/lib/services/anchor-reconciliation.service";
import { sendRecoveryEmailAction, sendAllRecoveryEmailsAction } from "@/lib/actions/admin-account-recovery.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LinkAnchorCustomerForm, SyncWalletForm } from "@/components/admin/anchor-lookup-form";

export const metadata: Metadata = {
  title: "Account Recovery",
  robots: { index: false, follow: false },
};

function StatusRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-t py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

export default async function AdminAccountRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const [users, lookup] = await Promise.all([
    listUsersNeedingRecovery(),
    email?.trim() ? findUserAnchorState(email.trim()) : Promise.resolve(undefined),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Account recovery</h1>
        <p className="text-muted-foreground">
          Manually reconcile Anchor wallet issues that can&apos;t fix themselves automatically — none of this ever
          needs a secret key typed anywhere; every action here runs server-side against Anchor.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Look up an account</CardTitle>
          <CardDescription>
            Search any account by email to see its Anchor-linkage state and fix it directly — covers cases the list
            below doesn&apos;t catch, like a customer that&apos;s fully verified but whose wallet number never
            landed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form method="get" className="flex items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs">
                Email
              </Label>
              <Input id="email" name="email" type="email" defaultValue={email} className="w-72" required />
            </div>
            <Button type="submit" size="sm">
              Look up
            </Button>
          </form>

          {email?.trim() && !lookup && <p className="text-sm text-muted-foreground">No account found for {email}.</p>}

          {lookup && (
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">
                    {lookup.firstName} {lookup.lastName}
                  </div>
                  <div className="text-sm text-muted-foreground">{lookup.email}</div>
                </div>
                <Badge variant="outline">{lookup.role}</Badge>
              </div>

              <StatusRow label="KYC verified" value={lookup.kycVerified ? "Yes" : "No"} />
              <StatusRow label="Anchor customer" value={lookup.anchorCustomerId ?? "Not linked"} />
              <StatusRow label="Counterparty (bank link)" value={lookup.anchorCounterpartyId ?? "Not linked"} />
              <StatusRow label="Deposit account" value={lookup.depositAccountId ?? "Not created"} />
              <StatusRow label="Wallet account number" value={lookup.vaAccountNumber ?? "Not synced"} />
              {lookup.vaFailureReason && <StatusRow label="Last failure" value={lookup.vaFailureReason} />}

              <div className="mt-4 space-y-3 border-t pt-4">
                {!lookup.anchorCustomerId && (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      No customer linked — if creation failed because a customer with this email already exists at
                      Anchor, find the existing customer ID in Anchor&apos;s dashboard and link it here (verified
                      server-side against the email before linking).
                    </p>
                    <LinkAnchorCustomerForm userId={lookup.id} />
                  </div>
                )}
                {lookup.anchorCustomerId && !lookup.vaAccountNumber && (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Customer linked but no wallet number yet — Anchor never sends the real number over a webhook,
                      only a direct API call reveals it. This creates the deposit account if missing, then fetches it.
                    </p>
                    <SyncWalletForm userId={lookup.id} />
                  </div>
                )}
                {lookup.anchorCustomerId && lookup.vaAccountNumber && (
                  <p className="text-sm text-muted-foreground">Fully provisioned — nothing to reconcile.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-base">Affected users</CardTitle>
              <CardDescription>
                {users.length} total — provisioning failed outright or stalled with no bank account collected.
              </CardDescription>
            </div>
            {users.length > 0 && (
              <form action={sendAllRecoveryEmailsAction}>
                <Button type="submit" variant="outline" size="sm">
                  Send to all ({users.length})
                </Button>
              </form>
            )}
          </div>
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
                        {!user.anchorCustomerId && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            Or look up {user.email} above to link an existing customer directly.
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
