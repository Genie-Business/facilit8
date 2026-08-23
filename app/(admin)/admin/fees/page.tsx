import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getActiveFeesByScope, PLATFORM_FEE_SCOPES, PLATFORM_FEE_SCOPE_LABELS } from "@/lib/services/platform-fee.service";
import { deactivatePlatformFeeAction } from "@/lib/actions/admin-fee.actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlatformFeeForm } from "@/components/admin/platform-fee-form";

export const metadata: Metadata = {
  title: "Platform Fees",
  robots: { index: false, follow: false },
};

export default async function AdminFeesPage() {
  const session = await auth();
  // Billing config — Support Admins can't act on it (requireSuperAdmin() in the actions), so
  // don't show it either. Matches the Awé Pricing page's precedent.
  if (session?.user.adminTier !== "SUPER_ADMIN") redirect("/admin");

  const activeFees = await getActiveFeesByScope();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Platform fees</h1>
        <p className="text-muted-foreground">
          The percentage Facilit8 keeps before paying out, settled to the configured Anchor settlement account. A
          scope with no active fee takes 0%.
        </p>
      </div>

      {PLATFORM_FEE_SCOPES.map((scope) => {
        const fee = activeFees.get(scope);
        const currentPercentage = fee ? Number(fee.percentage) : 0;

        return (
          <Card key={scope}>
            <CardHeader>
              <CardTitle className="text-base">{PLATFORM_FEE_SCOPE_LABELS[scope]}</CardTitle>
              <CardDescription>
                {fee
                  ? `Currently ${currentPercentage}%, active since ${fee.effectiveFrom.toLocaleDateString()}.`
                  : "Currently inactive — taking 0%."}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-end justify-between gap-4">
              <PlatformFeeForm scope={scope} currentPercentage={currentPercentage} />
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
