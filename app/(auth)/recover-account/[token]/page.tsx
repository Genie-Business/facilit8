import type { Metadata } from "next";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RedeemRecoveryForm } from "@/components/account-recovery/redeem-recovery-form";
import { getBankOptions } from "@/lib/services/bank-list.service";

export const metadata: Metadata = {
  title: "Recover Your Account",
  robots: { index: false, follow: false },
};

export default async function RecoverAccountPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const banks = await getBankOptions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Finish setting up your wallet</CardTitle>
        <CardDescription>
          Confirm the bank account you&apos;d like to receive withdrawals on, and we&apos;ll complete the rest of
          your Facilit8 wallet setup automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RedeemRecoveryForm token={token} banks={banks} />
      </CardContent>
    </Card>
  );
}
