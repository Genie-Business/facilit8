import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WithdrawForm } from "@/components/wallet/withdraw-form";
import { LinkBankAccountForm } from "@/components/wallet/link-bank-account-form";
import { ChangeBankAccount } from "@/components/wallet/change-bank-account";
import { getBankOptions } from "@/lib/services/bank-list.service";

export default async function WithdrawPage() {
  const session = await auth();
  if (!session) return null;

  const [user, banks] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    getBankOptions(),
  ]);
  if (!user) return null;
  // depositAccountId (the receiving wallet, tied to KYC) is a hard prerequisite — without
  // it there's nothing to withdraw from. A missing anchorCounterpartyId (withdrawal bank
  // account) is handled inline below instead of redirecting away.
  if (!user.depositAccountId) redirect("/wallet");

  const bankLabel = `${user.linkedBankName ?? "linked bank"} · ${user.linkedAccountNumber ?? ""}`;

  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-2xl font-semibold">Withdraw funds</h1>

      {!user.anchorCounterpartyId ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Link a bank account to withdraw from your wallet.</p>
          <LinkBankAccountForm banks={banks} />
        </div>
      ) : (
        <>
          <ChangeBankAccount banks={banks} currentLabel={bankLabel} />
          <WithdrawForm bankLabel={bankLabel} />
        </>
      )}
    </div>
  );
}
