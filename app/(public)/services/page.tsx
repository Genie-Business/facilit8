import type { Metadata } from "next";

import { MarketingPageHeader } from "@/components/marketing/page-header";
import { HoverRollButton } from "@/components/marketing/hover-roll-button";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "See how Event Managers post and fund training needs, how Facilitators bid and get paid, and how Professionals grow with Awe on Facilit8.",
  alternates: { canonical: "/services" },
};

const EVENT_MANAGER_STEPS = [
  { title: "Post your training need", body: "Set the dates, delegate count, budget, and category — public or invite-only." },
  { title: "Review facilitator bids", body: "Compare proposals, course breakdowns, and per-delegate pricing side by side." },
  { title: "Fund it securely", body: "Move budget into escrow from your Facilit8 wallet before the facilitator is confirmed." },
  { title: "Pay on completion", body: "Mark the training complete and release payment, minus the platform fee, in one step." },
];

const FACILITATOR_STEPS = [
  { title: "Build your profile", body: "Specialization, qualifications, and experience — the things Event Managers actually screen for." },
  { title: "Browse open events", body: "Find training needs that match your expertise and submit a bid with your rate." },
  { title: "Get selected", body: "Event Managers review bids and confirm a facilitator once budget is funded." },
  { title: "Get paid on completion", body: "Funds move to your wallet automatically once the training is marked complete." },
];

const PROFESSIONAL_STEPS = [
  { title: "Build your profile", body: "Sign up independent, or affiliate with a verified organization — either way, Awe starts learning your goals." },
  { title: "Browse the ecosystem", body: "See the open training events and the facilitator directory shaping your industry." },
  { title: "Grow with Awe", body: "Get a career partner grounded in real Facilit8 data — not generic advice — that turns your profile into a concrete next step." },
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

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#F5F5F5] p-8 sm:p-10">
            <h2 className="text-2xl font-medium tracking-tight text-foreground">Merged training</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Some training programs are too expensive for one company to justify alone. Merged
              training lets multiple Event Managers pool their budgets into a single session, split
              by delegate count, then vote together on which facilitator runs it.
            </p>
          </div>
          <div className="rounded-2xl bg-[#F5F5F5] p-8 sm:p-10">
            <h2 className="text-2xl font-medium tracking-tight text-foreground">Awe, for everyone</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Awe isn&apos;t just for Professionals — Facilitators use it to grow their
              specialization between engagements, and Event Managers use it for their own career
              progression too.
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
