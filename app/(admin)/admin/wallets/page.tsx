import type { Metadata } from "next";
import { CircleAlert, CircleCheck } from "lucide-react";

import { getWalletsOverview } from "@/lib/services/admin-wallets.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = {
  title: "Wallets",
  robots: { index: false, follow: false },
};

// Always read live: this page exists to show the state of the money right now.
export const dynamic = "force-dynamic";

const naira = (value: number) => `₦${value.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Figure({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {note && <p className="mt-1 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

export default async function AdminWalletsPage() {
  const overview = await getWalletsOverview();
  const { summary, integrity, paystackBalance, difference } = overview;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Wallets</h1>
        <p className="text-muted-foreground">
          Paystack holds one pooled balance for everyone. Each user&apos;s wallet is a record in Facilit8&apos;s own
          ledger, and this page checks that the ledger and the real balance tell the same story.
        </p>
      </div>

      {!integrity.ok && (
        <Alert variant="destructive">
          <AlertDescription>
            <p className="font-medium">The ledger failed its integrity check. Stop and investigate before anything else.</p>
            <ul className="mt-2 list-disc pl-5">
              {integrity.issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-base">
            Paystack balance
            {paystackBalance === null ? (
              <Badge variant="outline">Unavailable</Badge>
            ) : Math.abs(difference ?? 0) < 0.005 ? (
              <Badge variant="secondary" className="gap-1">
                <CircleCheck className="size-3" /> Matches the ledger
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <CircleAlert className="size-3" /> {naira(Math.abs(difference ?? 0))} {(difference ?? 0) > 0 ? "more" : "less"} than the ledger expects
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {overview.paystackConfigured
              ? "A small, temporary gap is normal: a deposit is credited the moment Paystack announces it, a little before it settles into the balance. A gap that stays means money moved that the ledger doesn't know about."
              : "Paystack isn't configured on this deployment, so the real balance can't be read."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid !grid-cols-1 !gap-3 sm:!grid-cols-2">
          <Figure label="Ledger says it should be" value={naira(summary.expectedPaystackBalance)} note="Money in minus money out." />
          <Figure
            label="Paystack says it is"
            value={paystackBalance === null ? "—" : naira(paystackBalance)}
            note={paystackBalance === null && overview.paystackConfigured ? "Paystack couldn't be reached just now." : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Where the money sits</CardTitle>
          <CardDescription>
            {naira(summary.liabilities)} is owed to users and held on their behalf; the rest is Facilit8&apos;s.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid !grid-cols-1 !gap-3 sm:!grid-cols-2 lg:!grid-cols-3">
          <Figure label="In user wallets" value={naira(summary.userWallets)} />
          <Figure label="In escrow" value={naira(summary.escrow)} note="Funded events and shares not yet paid out." />
          <Figure label="In withdrawals in flight" value={naira(summary.transfersPending)} note="Held until Paystack confirms or fails the transfer." />
          <Figure label="Facilit8 revenue" value={naira(summary.revenue)} note="Payout, withdrawal, chat and Awé fees kept." />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Withdrawals waiting too long</CardTitle>
          <CardDescription>
            Still waiting on Paystack after an hour. The money is held, not lost; the catch-up job keeps asking Paystack and settles or
            returns it. If one stays here, check the transfer by its reference in the Paystack dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {overview.stuckWithdrawals.length === 0 ? (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CircleCheck className="size-4" /> None.
            </p>
          ) : (
            overview.stuckWithdrawals.map((withdrawal) => (
              <div key={withdrawal.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-sm">
                <div>
                  <p className="font-medium">
                    {withdrawal.user.firstName} {withdrawal.user.lastName} · {naira(Number(withdrawal.amount))}
                  </p>
                  <p className="text-muted-foreground">
                    {withdrawal.user.email} · started {withdrawal.createdAt.toLocaleString("en-NG")}
                  </p>
                  <p className="break-all font-mono text-xs text-muted-foreground">{withdrawal.reference}</p>
                </div>
                <Badge variant="destructive">Pending</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent ledger activity</CardTitle>
          <CardDescription>
            The last {overview.recentJournals.length} journals. Withdrawals so far:{" "}
            {Object.entries(overview.withdrawalCounts)
              .map(([status, count]) => `${count} ${status.toLowerCase()}`)
              .join(", ") || "none"}
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {overview.recentJournals.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing has moved yet.</p>
          ) : (
            overview.recentJournals.map((journal) => (
              <div key={journal.id} className="flex flex-wrap items-center justify-between gap-2 border-b py-2 text-sm last:border-b-0">
                <div>
                  <span className="font-medium">{journal.type.replaceAll("_", " ").toLowerCase()}</span>
                  {journal.description && <span className="text-muted-foreground"> · {journal.description}</span>}
                  <p className="break-all font-mono text-xs text-muted-foreground">{journal.reference}</p>
                </div>
                <span className="text-xs text-muted-foreground">{journal.createdAt.toLocaleString("en-NG")}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
