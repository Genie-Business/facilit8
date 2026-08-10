import type { Metadata } from "next";

import { getActiveAwePricing } from "@/lib/services/awe-pricing.service";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AwePricingForm } from "@/components/admin/awe-pricing-form";

export const metadata: Metadata = {
  title: "Awe Pricing",
  robots: { index: false, follow: false },
};

export default async function AdminAwePricingPage() {
  const pricing = await getActiveAwePricing();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Awe pricing</h1>
        <p className="text-muted-foreground">
          Set the monthly subscription price for Awe, Facilit8&apos;s AI Career &amp; Professional Growth Partner —
          or make it free for everyone.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current setting</CardTitle>
          <CardDescription>
            {pricing.isFree
              ? "Awe is free for everyone right now."
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
