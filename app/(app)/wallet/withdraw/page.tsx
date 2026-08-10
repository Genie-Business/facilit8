import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { WithdrawForm } from "@/components/wallet/withdraw-form";

export default async function WithdrawPage() {
  const session = await auth();
  if (!session) return null;

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return null;
  if (!user.depositAccountId || !user.anchorCounterpartyId) redirect("/wallet");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Withdraw funds</h1>
      <WithdrawForm bankLabel={`${user.linkedBankName ?? "linked bank"} — ${user.linkedAccountNumber ?? ""}`} />
    </div>
  );
}
