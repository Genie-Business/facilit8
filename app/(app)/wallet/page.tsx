import Link from "next/link";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getWalletBalance } from "@/lib/services/wallet.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function WalletPage() {
  const session = await auth();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;

  const hasWallet = Boolean(user.depositAccountId);
  const balance = hasWallet ? await getWalletBalance(session.user.id) : null;

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Wallet</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Balance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {hasWallet ? (
            <>
              <p className="text-3xl font-semibold">₦{(balance ?? 0).toLocaleString()}</p>
              {user.vaAccountNumber && (
                <p className="text-sm text-muted-foreground">
                  Fund via {user.vaBankName}: {user.vaAccountNumber}
                </p>
              )}
              <div className="flex gap-2 pt-2">
                <Button size="sm" render={<Link href="/wallet/withdraw" />} nativeButton={false}>
                  Withdraw
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  render={<Link href="/wallet/transactions" />}
                  nativeButton={false}
                >
                  Transaction history
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Your wallet isn&apos;t set up yet. Complete identity verification to get one.
              </p>
              <Button size="sm" render={<Link href="/settings/kyc" />} nativeButton={false}>
                Verify identity
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
