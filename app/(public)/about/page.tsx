import type { Metadata } from "next";
import { Handshake, ShieldCheck, Users } from "lucide-react";

import { MarketingPageHeader } from "@/components/marketing/page-header";
import { HoverRollButton } from "@/components/marketing/hover-roll-button";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Facilit8 connects corporate event managers with vetted training facilitators across Nigeria, with funds held securely until training is confirmed complete.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  {
    icon: Users,
    title: "Vetted, not anonymous",
    body: "Every facilitator on Facilit8 builds a real profile — specialization, experience, and reviews from past engagements.",
  },
  {
    icon: ShieldCheck,
    title: "Funds held, not promised",
    body: "Training budgets sit in a secure wallet until an engagement is confirmed complete, so payment is never just a handshake.",
  },
  {
    icon: Handshake,
    title: "Built for teams, not one-off gigs",
    body: "Merged training lets multiple companies pool budget for sessions no single team could justify alone.",
  },
];

export default function AboutPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="About Facilit8"
        title="We built the marketplace we wished existed."
        description="Facilit8 exists because sourcing corporate training shouldn't take longer than the training itself."
      />

      <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">Our mission</h2>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">
            Event Managers spend weeks chasing down trainers over email, and skilled facilitators
            spend just as long chasing down clients. Facilit8 puts both sides in one marketplace —
            with bidding, messaging, and payment built in — so a training program goes from idea to
            funded in days.
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {VALUES.map((value) => (
            <div key={value.title}>
              <value.icon className="size-8 text-brand" strokeWidth={1.5} />
              <p className="mt-4 font-semibold text-foreground">{value.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <HoverRollButton href="/signup">Join Facilit8</HoverRollButton>
        </div>
      </section>
    </>
  );
}
