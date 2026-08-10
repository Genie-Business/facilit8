import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getActiveAwePricing } from "@/lib/services/awe-pricing.service";
import { hasAweAccess } from "@/lib/services/awe-subscription.service";
import { SubscribeToAweForm } from "@/components/awe/subscribe-to-awe-form";

export const metadata: Metadata = {
  title: "Subscribe to Awe",
  robots: { index: false, follow: false },
};

export default async function AweSubscribePage() {
  const session = await auth();
  if (!session) return null;

  const access = await hasAweAccess(session.user.id);
  if (access) redirect("/awe");

  const pricing = await getActiveAwePricing();

  return (
    <div style={{ maxWidth: 480 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, color: "var(--t-base)" }}>Unlock Awe</h1>
      <p style={{ color: "var(--t-muted)", fontSize: 13, marginBottom: 20 }}>
        Your AI Career &amp; Professional Growth Partner — understands where you are, where you want to go, and
        what to do next.
      </p>

      <div className="card">
        <div className="card-head">
          <div className="card-title-wrap">
            <span className="eyebrow">Pricing</span>
            <h2 className="card-title">Awe subscription</h2>
          </div>
        </div>

        {pricing.isFree ? (
          <p style={{ fontSize: 14, color: "var(--t-base)" }}>Awe is currently free for everyone on Facilit8.</p>
        ) : (
          <div>
            <p style={{ fontSize: 22, fontWeight: 700, color: "var(--t-base)" }}>
              ₦{Number(pricing.monthlyPrice).toLocaleString()}
            </p>
            <p style={{ color: "var(--t-muted)", fontSize: 12.5 }}>
              {pricing.durationDays} days of access, billed from your Facilit8 wallet
            </p>
          </div>
        )}

        <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-soft)" }}>
          <SubscribeToAweForm />
        </div>
      </div>
    </div>
  );
}
