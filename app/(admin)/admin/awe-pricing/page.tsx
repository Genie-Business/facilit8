import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getActiveAwePricing } from "@/lib/services/awe-pricing.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AwePricingForm } from "@/components/admin/awe-pricing-form";

export const metadata: Metadata = {
  title: "Awé Pricing",
  robots: { index: false, follow: false },
};

export default async function AdminAwePricingPage() {
  const session = await auth();
  // Billing page — Support Admins can't act on it (requireSuperAdmin() in the actions), so
  // don't show it either.
  if (session?.user.adminTier !== "SUPER_ADMIN") redirect("/admin");

  const pricing = await getActiveAwePricing();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Awé pricing</h1>
        <p className="text-muted-foreground">
          Set the monthly subscription price for Awé, Facilit8&apos;s AI Career &amp; Professional Growth Partner,
          or make it free for everyone.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current setting</CardTitle>
          <CardDescription>
            {pricing.isFree
              ? "Awé is free for everyone right now."
              : `₦${Number(pricing.monthlyPrice).toLocaleString()} every ${pricing.durationDays} days, billed from users' Facilit8 wallets.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AwePricingForm
            monthlyPrice={Number(pricing.monthlyPrice)}
            durationDays={pricing.durationDays}
            isFree={pricing.isFree}
          />
        </CardContent>
      </Card>
    </div>
  );
}
