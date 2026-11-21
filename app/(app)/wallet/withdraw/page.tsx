import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { WithdrawForm } from "@/components/wallet/withdraw-form";
import { LinkBankAccountForm } from "@/components/wallet/link-bank-account-form";
import { ChangeBankAccount } from "@/components/wallet/change-bank-account";
import { getBankOptions } from "@/lib/services/bank-list.service";
import { getFeeSchedule } from "@/lib/services/fee.service";
import { getWalletBalance } from "@/lib/services/wallet.service";

export default async function WithdrawPage() {
  const session = await auth();
  if (!session) return null;

  const [user, banks, feeSchedule, balance] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    getBankOptions(),
    getFeeSchedule("WITHDRAWAL"),
    getWalletBalance(session.user.id),
  ]);
  if (!user) return null;
  // depositAccountId (the user's wallet, which exists once KYC passes) is a hard prerequisite — without
  // it there's nothing to withdraw from. A missing paystackRecipientCode (withdrawal bank
  // account) is handled inline below instead of redirecting away.
  if (!user.depositAccountId) redirect("/wallet");

  const bankLabel = `${user.linkedBankName ?? "linked bank"} · ${user.linkedAccountNumber ?? ""}`;

  return (
    <div className="max-w-xl space-y-6">
      <header className="space-y-2">
        <Link
          href="/wallet"
          className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-4 focus-visible:ring-action/30"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Wallet
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Withdraw funds</h1>
      </header>

      {!user.paystackRecipientCode ? (
        <Card size="lg" className="shadow-sm">
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">Link a bank account to withdraw from your wallet.</p>
            <LinkBankAccountForm banks={banks} />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card size="lg" className="shadow-sm">
            <CardContent>
              <ChangeBankAccount banks={banks} currentLabel={bankLabel} />
            </CardContent>
          </Card>
          <Card size="lg" className="shadow-sm">
            <CardContent>
              <WithdrawForm feeSchedule={feeSchedule} balance={balance} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
