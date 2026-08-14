import type { Metadata } from "next";
import { MessageCircle, ShieldCheck, Users, Wallet } from "lucide-react";

import { MarketingPageHeader } from "@/components/marketing/page-header";
import { HoverRollButton } from "@/components/marketing/hover-roll-button";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "See how Event Managers post and fund training needs, how Facilitators bid and get paid, and how Professionals grow with Awé on Facilit8.",
  alternates: { canonical: "/services" },
};

const EVENT_MANAGER_STEPS = [
  { title: "Post your training need", body: "Set the dates, delegate count, budget, and category: public or invite-only." },
  { title: "Review facilitator bids", body: "Compare proposals, course breakdowns, and per-delegate pricing side by side." },
  { title: "Fund it securely", body: "Move budget into escrow from your Facilit8 wallet before the facilitator is confirmed." },
  { title: "Pay on completion", body: "Mark the training complete and release payment, minus the platform fee, in one step." },
];

const FACILITATOR_STEPS = [
  { title: "Build your profile", body: "Specialization, qualifications, and experience: the things Event Managers actually screen for." },
  { title: "Browse open events", body: "Find training needs that match your expertise and submit a bid with your rate." },
  { title: "Get selected", body: "Event Managers review bids and confirm a facilitator once budget is funded." },
  { title: "Get paid on completion", body: "Funds move to your wallet automatically once the training is marked complete." },
  { title: "Or propose your own session", body: "Skip bidding entirely: invite organisations to fund it and fellow facilitators to co-deliver it." },
];

const PLATFORM_FEATURES = [
  {
    icon: Wallet,
    title: "Escrow wallet",
    body: "Every training budget sits in a secure wallet until the engagement is confirmed complete. Funds move on completion, not a handshake.",
  },
  {
    icon: ShieldCheck,
    title: "Identity verification",
    body: "Wallets are backed by verified identity through our payment provider, so every transaction on Facilit8 is tied to a real, confirmed person.",
  },
  {
    icon: MessageCircle,
    title: "Direct messaging",
    body: "Unlock a direct line to a facilitator to align on scope, dates, and delivery before you commit budget or accept a bid.",
  },
  {
    icon: Users,
    title: "Facilitator directory",
    body: "Browse real profiles: specialization, experience, and track record from past engagements, not cold outreach.",
  },
];

const PROFESSIONAL_STEPS = [
  { title: "Build your profile", body: "Sign up independent, or affiliate with a verified organization. Either way, Awé starts learning your goals." },
  { title: "Browse the ecosystem", body: "See the open training events and the facilitator directory shaping your industry." },
  { title: "Grow with Awé", body: "Get a career partner grounded in real Facilit8 data, not generic advice, that turns your profile into a concrete next step." },
  { title: "Or start your own merged session", body: "Invite other professionals in your field to pool funds and bring in a facilitator together." },
];

function StepList({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="space-y-6">
      {steps.map((step, i) => (
        <li key={step.title} className="flex gap-4">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand-dark">
            {i + 1}
          </span>
          <div>
            <p className="font-semibold text-foreground">{step.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function ServicesPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="How it works"
        title="Three roles, one platform built around each of them."
        description="Whether you're staffing a training, facilitating one, or figuring out your next career move, Facilit8 handles it end to end."
      />

      <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-16 lg:grid-cols-3">
          <div>
            <h2 className="mb-8 text-2xl font-medium tracking-tight text-foreground">For Event Managers</h2>
            <StepList steps={EVENT_MANAGER_STEPS} />
          </div>
          <div>
            <h2 className="mb-8 text-2xl font-medium tracking-tight text-foreground">For Facilitators</h2>
            <StepList steps={FACILITATOR_STEPS} />
          </div>
          <div>
            <h2 className="mb-8 text-2xl font-medium tracking-tight text-foreground">For Professionals</h2>
            <StepList steps={PROFESSIONAL_STEPS} />
          </div>
        </div>

        <div className="mt-20">
          <h2 className="mb-8 text-2xl font-medium tracking-tight text-foreground">What&apos;s included, for everyone</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORM_FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-2xl border p-6">
                <feature.icon className="size-6 text-brand" strokeWidth={1.5} />
                <p className="mt-4 font-semibold text-foreground">{feature.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#F5F5F5] p-8 sm:p-10">
            <h2 className="text-2xl font-medium tracking-tight text-foreground">Merged training</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Some training programs are too expensive to justify alone. Event Managers can pool
              budget across organisations, split by delegate count, then vote on which facilitator
              runs it. Professionals can do the same with peers in their field. Facilitators can
              propose their own session, inviting organisations to fund it and fellow facilitators
              to co-deliver it.
            </p>
          </div>
          <div className="rounded-2xl bg-[#F5F5F5] p-8 sm:p-10">
            <h2 className="text-2xl font-medium tracking-tight text-foreground">Ask Awé. Whoever you are.</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Awé isn&apos;t just for Professionals. Facilitators use it to grow their
              specialization between engagements, and Event Managers use it for their own career
              progression too. Everyone on Facilit8 has a next step, and Awé helps find it.
            </p>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <HoverRollButton href="/signup">Get started</HoverRollButton>
        </div>
      </section>
    </>
  );
}
