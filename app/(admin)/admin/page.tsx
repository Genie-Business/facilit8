import Link from "next/link";
import { FileText, Activity, Repeat, Tags, Sparkles } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const SECTIONS = [
  { href: "/admin/content", icon: FileText, title: "Content", description: "FAQ, Privacy, Terms, and contact info." },
  { href: "/admin/activity", icon: Activity, title: "Activity", description: "Recent applications, reviews, and notifications." },
  { href: "/admin/awe-subscriptions", icon: Repeat, title: "Awe Subscriptions", description: "Manage subscribers and billing history." },
  { href: "/admin/skills", icon: Tags, title: "Skills", description: "Skills facilitators can select on their profile." },
  { href: "/admin/awe-pricing", icon: Sparkles, title: "Awe Pricing", description: "Monthly price and billing cycle for Awe." },
];

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Admin</h1>
      <p className="text-muted-foreground">Manage site content, subscriptions, and user activity.</p>

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
