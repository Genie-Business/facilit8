import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getActiveFeesByScope, PLATFORM_FEE_SCOPES, PLATFORM_FEE_SCOPE_LABELS } from "@/lib/services/platform-fee.service";
import { deactivatePlatformFeeAction } from "@/lib/actions/admin-fee.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlatformFeeForm } from "@/components/admin/platform-fee-form";
import { ChatFeeForm } from "@/components/admin/chat-fee-form";
import { getActiveChatPricing } from "@/lib/services/chat-payment.service";

export const metadata: Metadata = {
  title: "Platform Fees",
  robots: { index: false, follow: false },
};

export default async function AdminFeesPage() {
  const session = await auth();
  // Billing config — Support Admins can't act on it (requireSuperAdmin() in the actions), so
  // don't show it either. Matches the Awé Pricing page's precedent.
  if (session?.user.adminTier !== "SUPER_ADMIN") redirect("/admin");

  const [activeFees, chatPricing] = await Promise.all([getActiveFeesByScope(), getActiveChatPricing()]);
  const chatFee = Number(chatPricing.amount);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform fees</h1>
        <p className="text-muted-foreground">
          The percentage Facilit8 keeps before paying out, settled to the configured Anchor settlement account. A
          scope with no active fee takes 0%. Chat access is a flat naira fee instead.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chat access (flat fee)</CardTitle>
          <CardDescription>
            Charged to the Event Manager once to unlock a conversation with a facilitator — currently ₦
            {chatFee.toLocaleString("en-NG")}, for {chatPricing.durationDays} days of access. Changes apply to new
            unlocks only; conversations already paid for keep the access they were sold.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChatFeeForm currentAmount={chatFee} />
        </CardContent>
      </Card>

      {PLATFORM_FEE_SCOPES.map((scope) => {
        const fee = activeFees.get(scope);
        const currentPercentage = fee ? Number(fee.percentage) : 0;
        const currentMax = fee?.maxAmount != null ? Number(fee.maxAmount) : null;
        const isWithdrawal = scope === "WITHDRAWAL";

        return (
          <Card key={scope}>
            <CardHeader>
              <CardTitle className="text-base">{PLATFORM_FEE_SCOPE_LABELS[scope]}</CardTitle>
              <CardDescription>
                {fee
                  ? `Currently ${currentPercentage}%${currentMax !== null ? `, capped at ₦${currentMax.toLocaleString("en-NG")}` : ""}, active since ${fee.effectiveFrom.toLocaleDateString()}.`
                  : "Currently inactive — taking 0%."}
              </CardDescription>
              {isWithdrawal && (
                <CardDescription>
                  Taken from the user&apos;s wallet when they withdraw: the bank receives the amount minus this fee, and the
                  fee is deposited into the settlement account, where Anchor&apos;s own transfer charge comes out of it and
                  the rest is Facilit8&apos;s. It&apos;s collected once the bank confirms the payout, so a failed withdrawal
                  costs the user nothing. The maximum fee is the most any one withdrawal is charged, however large;
                  leave it blank for no cap.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-4">
              <PlatformFeeForm
                scope={scope}
                currentPercentage={currentPercentage}
                withMaxAmount={isWithdrawal}
                currentMaxAmount={currentMax}
              />
              {fee && (
                <form
                  action={async () => {
                    "use server";
                    await deactivatePlatformFeeAction(scope);
                  }}
                >
                  <Button type="submit" variant="outline" size="sm">
                    Deactivate
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
