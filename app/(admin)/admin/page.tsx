import Link from "next/link";
import { FileText, Activity, Repeat, Tags, Sparkles, CircleCheck, CircleAlert, ShieldAlert, LifeBuoy } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCronRunStatus } from "@/lib/services/cron-run.service";

const SECTIONS = [
  { href: "/admin/content", icon: FileText, title: "Content", description: "FAQ, Privacy, Terms, and contact info." },
  { href: "/admin/activity", icon: Activity, title: "Activity", description: "Recent applications, reviews, and notifications." },
  { href: "/admin/disputes", icon: ShieldAlert, title: "Disputes", description: "Review refund requests for funded training." },
  { href: "/admin/account-recovery", icon: LifeBuoy, title: "Account Recovery", description: "Users with incomplete Anchor wallet setup." },
  { href: "/admin/awe-subscriptions", icon: Repeat, title: "Awé Subscriptions", description: "Manage subscribers and billing history." },
  { href: "/admin/skills", icon: Tags, title: "Skills", description: "Skills facilitators can select on their profile." },
  { href: "/admin/awe-pricing", icon: Sparkles, title: "Awé Pricing", description: "Monthly price and billing cycle for Awé." },
];

// Reconciliation runs every 30 min via GitHub Actions (Vercel Hobby only allows daily cron);
// the daily job runs once at 07:00 UTC. Both intervals feed getCronRunStatus's 1.5x buffer.
const CRON_JOBS = [
  { jobName: "webhook-reconciliation", label: "Webhook reconciliation", intervalMs: 30 * 60 * 1000 },
  { jobName: "daily", label: "Daily jobs (reminders, Awé billing)", intervalMs: 24 * 60 * 60 * 1000 },
];

export default async function AdminHomePage() {
  const cronStatuses = await Promise.all(
    CRON_JOBS.map(async (job) => ({ ...job, ...(await getCronRunStatus(job.jobName, job.intervalMs)) }))
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-muted-foreground">Manage site content, subscriptions, and user activity.</p>

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

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((section) => (
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
