import Link from "next/link";
import {
  ChartColumn,
  FileText,
  Activity,
  Repeat,
  Tags,
  Sparkles,
  CircleCheck,
  CircleAlert,
  ShieldAlert,
  LifeBuoy,
  Users,
} from "lucide-react";

import { auth } from "@/lib/auth";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCronRunStatus } from "@/lib/services/cron-run.service";
import { getQuickStats } from "@/lib/services/admin-analytics.service";
import { formatCount } from "@/lib/analytics/format";
import { StatTile } from "@/components/admin/analytics/stat-tile";
import "@/components/admin/analytics/analytics.css";

// Accessible to both admin tiers — day-to-day tools.
const SECTIONS = [
  { href: "/admin/analytics", icon: ChartColumn, title: "Analytics", description: "New users, events, applications, revenue and engagement, with CSV exports." },
  { href: "/admin/content", icon: FileText, title: "Content", description: "FAQ, Privacy, Terms, and contact info." },
  { href: "/admin/activity", icon: Activity, title: "Activity", description: "Recent applications, reviews, and notifications." },
  { href: "/admin/disputes", icon: ShieldAlert, title: "Disputes", description: "Review refund requests for funded training." },
  { href: "/admin/account-recovery", icon: LifeBuoy, title: "Account Recovery", description: "Users with incomplete Anchor wallet setup." },
  { href: "/admin/skills", icon: Tags, title: "Skills", description: "Skills facilitators can select on their profile." },
];

// Super Admin only — billing/pricing and admin management.
const SUPER_ADMIN_SECTIONS = [
  { href: "/admin/awe-subscriptions", icon: Repeat, title: "Awé Subscriptions", description: "Manage subscribers and billing history." },
  { href: "/admin/awe-pricing", icon: Sparkles, title: "Awé Pricing", description: "Monthly price and billing cycle for Awé." },
  { href: "/admin/admins", icon: Users, title: "Admin Management", description: "Create admins and manage their access tier." },
];

// Reconciliation runs every 30 min via GitHub Actions (Vercel Hobby only allows daily cron);
// the daily job runs once at 07:00 UTC. Both intervals feed getCronRunStatus's 1.5x buffer.
const CRON_JOBS = [
  { jobName: "webhook-reconciliation", label: "Webhook reconciliation", intervalMs: 30 * 60 * 1000 },
  { jobName: "daily", label: "Daily jobs (reminders, Awé billing)", intervalMs: 24 * 60 * 60 * 1000 },
];

export default async function AdminHomePage() {
  const session = await auth();
  const sections = session?.user.adminTier === "SUPER_ADMIN" ? [...SECTIONS, ...SUPER_ADMIN_SECTIONS] : SECTIONS;

  const [cronStatuses, stats] = await Promise.all([
    Promise.all(CRON_JOBS.map(async (job) => ({ ...job, ...(await getCronRunStatus(job.jobName, job.intervalMs)) }))),
    getQuickStats(),
  ]);

  return (
    <div className="viz">
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-muted-foreground">Manage site content, subscriptions, and user activity.</p>

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Last 7 days</h2>
        <Link href="/admin/analytics" className="text-sm text-muted-foreground underline underline-offset-4">
          Full analytics
        </Link>
      </div>
      <div className="viz-kpis mt-3">
        <StatTile label="New users" value={formatCount(stats.newUsers.current)} current={stats.newUsers.current} previous={stats.newUsers.previous} />
        <StatTile label="Active users" value={formatCount(stats.activeUsers.current)} current={stats.activeUsers.current} previous={stats.activeUsers.previous} title="People who applied, posted, paid, chatted or reviewed." />
        <StatTile label="New events" value={formatCount(stats.newEvents.current)} current={stats.newEvents.current} previous={stats.newEvents.previous} />
        <StatTile label="Applications" value={formatCount(stats.applications.current)} current={stats.applications.current} previous={stats.applications.previous} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Background jobs</CardTitle>
          <CardDescription>Last confirmed run of each scheduled job.</CardDescription>
        </CardHeader>
        <div className="space-y-2 px-6 pb-6">
          {cronStatuses.map((job) => (
            <div key={job.jobName} className="flex items-center justify-between text-sm">
              <span className="text-foreground">{job.label}</span>
              <span className={`flex items-center gap-1.5 ${job.isStale ? "text-destructive" : "text-muted-foreground"}`}>
                {job.isStale ? <CircleAlert className="size-4" /> : <CircleCheck className="size-4" />}
                {job.lastRunAt ? `Last ran ${job.lastRunAt.toLocaleString()}` : "Never ran"}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <div className="mt-6 grid !gap-4 sm:!grid-cols-2 lg:!grid-cols-3">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="h-full transition-colors hover:bg-muted/50">
              <CardHeader>
                <section.icon className="size-5 text-brand" />
                <CardTitle className="text-base">{section.title}</CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
