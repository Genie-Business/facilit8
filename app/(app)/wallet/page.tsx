import Link from "next/link";
import { ArrowUpRight, History, ShieldCheck } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getWalletBalance } from "@/lib/services/wallet.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FundingDetails } from "@/components/wallet/funding-details";

export default async function WalletPage() {
  const session = await auth();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;

  const hasWallet = Boolean(user.depositAccountId);
  const balance = hasWallet ? await getWalletBalance(session.user.id) : null;

  return (
    <div className="max-w-2xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Wallet</h1>
        <p className="text-sm text-muted-foreground">Add money by bank transfer, and withdraw to your own bank account.</p>
      </header>

      {hasWallet ? (
        <>
          <Card size="lg" className="shadow-sm">
            <CardContent className="space-y-5">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available balance</p>
                <p className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
                  ₦{(balance ?? 0).toLocaleString("en-NG")}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" render={<Link href="/wallet/withdraw" />} nativeButton={false}>
                  <ArrowUpRight aria-hidden="true" data-icon="inline-start" />
                  Withdraw
                </Button>
                <Button size="lg" variant="outline" render={<Link href="/wallet/transactions" />} nativeButton={false}>
                  <History aria-hidden="true" data-icon="inline-start" />
                  Transaction history
                </Button>
              </div>
            </CardContent>
          </Card>

          {user.vaAccountNumber && (
            <Card size="lg" className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Add money</CardTitle>
                <CardDescription>
                  Send money from any bank app to your personal account below. It reaches your wallet automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <FundingDetails
                  bankName={user.vaBankName}
                  accountNumber={user.vaAccountNumber}
                  accountName={user.vaAccountName}
                />
                <p className="text-xs text-muted-foreground">
                  A small bank fee on a transfer in is taken from the amount that&apos;s credited.
                </p>
              </CardContent>
            </Card>
          )}
        </>
      ) : (
        <Card size="lg" className="shadow-sm">
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <ShieldCheck aria-hidden="true" className="size-5" />
              </span>
              <div className="space-y-1">
                <p className="font-medium">Your wallet isn&apos;t set up yet</p>
                <p className="text-sm text-muted-foreground">
                  Complete identity verification to get a wallet and your own account number to pay into.
                </p>
              </div>
            </div>
            <Button size="lg" render={<Link href="/settings/kyc" />} nativeButton={false}>
              Verify identity
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
