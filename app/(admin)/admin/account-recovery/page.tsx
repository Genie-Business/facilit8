import type { Metadata } from "next";

import { listUsersNeedingRecovery } from "@/lib/services/account-recovery.service";
import { findUserWalletState } from "@/lib/services/wallet-reconciliation.service";
import { sendRecoveryEmailAction, sendAllRecoveryEmailsAction } from "@/lib/actions/admin-account-recovery.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResyncWalletForm } from "@/components/admin/resync-wallet-form";

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
    email?.trim() ? findUserWalletState(email.trim()) : Promise.resolve(undefined),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Account recovery</h1>
        <p className="text-muted-foreground">
          Fix wallet setup problems that can&apos;t fix themselves. None of this ever needs a secret key typed
          anywhere; every action here runs server-side against Paystack.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Look up an account</CardTitle>
          <CardDescription>
            Search any account by email to see where its wallet setup stands — covers cases the list below
            doesn&apos;t catch, like someone who&apos;s set up but never completed identity verification.
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
              {lookup.kycFailedReason && <StatusRow label="Last KYC failure" value={lookup.kycFailedReason} />}
              <StatusRow label="Paystack customer" value={lookup.paystackCustomerCode ?? "Not created"} />
              <StatusRow
                label="Withdrawal bank (recipient)"
                value={
                  lookup.paystackRecipientCode
                    ? `${lookup.linkedBankName ?? "Linked"} · ${lookup.linkedAccountNumber ?? ""}`
                    : "Not linked"
                }
              />
              <StatusRow label="Wallet" value={lookup.depositAccountId ? "Active" : "Not created (needs KYC)"} />
              <StatusRow
                label="Virtual account to pay into"
                value={lookup.vaAccountNumber ? `${lookup.vaBankName ?? ""} ${lookup.vaAccountNumber}` : "Not assigned"}
              />
              <StatusRow label="Wallet balance" value={`₦${lookup.balance.toLocaleString("en-NG")}`} />
              {lookup.vaFailureReason && <StatusRow label="Last setup failure" value={lookup.vaFailureReason} />}

              <div className="mt-4 space-y-3 border-t pt-4">
                {!lookup.paystackCustomerCode || !lookup.paystackRecipientCode ? (
                  <div>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Part of the setup is missing. This re-runs it: it creates the Paystack customer and the withdrawal
                      recipient if they don&apos;t exist yet, and skips anything already done.
                    </p>
                    <ResyncWalletForm userId={lookup.id} />
                  </div>
                ) : lookup.depositAccountId ? (
                  <p className="text-sm text-muted-foreground">Fully set up — nothing to reconcile.</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Set up, waiting on identity verification. The wallet is created automatically when the user completes
                    it (Settings → Verify identity).
                  </p>
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
                  const issue = !user.paystackCustomerCode
                    ? "Customer creation failed"
                    : !user.paystackRecipientCode
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
