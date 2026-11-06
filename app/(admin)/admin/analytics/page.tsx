import type { Metadata } from "next";

import { auth } from "@/lib/auth";
import { parseRange } from "@/lib/analytics/range";
import { getPlatformAnalytics } from "@/lib/services/admin-analytics.service";
import { AnalyticsReport } from "@/components/admin/analytics/analytics-report";

export const metadata: Metadata = {
  title: "Analytics",
  robots: { index: false, follow: false },
};

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string | string[] }>;
}) {
  const session = await auth();
  // Money and exports are Super Admin only; the admin layout has already limited this page to admins.
  const isSuperAdmin = session?.user.adminTier === "SUPER_ADMIN";
  const rangeKey = parseRange((await searchParams).range);

  const data = await getPlatformAnalytics(rangeKey, { includeFinancials: isSuperAdmin });
  return <AnalyticsReport data={data} isSuperAdmin={isSuperAdmin} />;
}
