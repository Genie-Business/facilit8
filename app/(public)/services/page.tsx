import type { Metadata } from "next";

import { MarketingPageHeader } from "@/components/marketing/page-header";
import { HoverRollButton } from "@/components/marketing/hover-roll-button";
import { getMarketingPageContent } from "@/lib/services/marketing-content.service";
import { getMarketingIcon } from "@/lib/data/marketing-icons";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "See how Event Managers post and fund training needs, how Facilitators bid and get paid, and how Professionals grow with Awé on Facilit8.",
  alternates: { canonical: "/services" },
};

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

export default async function ServicesPage() {
  const content = await getMarketingPageContent("services");

  return (
    <>
      <MarketingPageHeader
        eyebrow={content.hero.eyebrow}
        title={content.hero.title}
        description={content.hero.description}
      />

      <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="grid gap-16 lg:grid-cols-3">
          <div>
            <h2 className="mb-8 text-2xl font-medium tracking-tight text-foreground">For Event Managers</h2>
            <StepList steps={content.eventManagerSteps} />
          </div>
          <div>
            <h2 className="mb-8 text-2xl font-medium tracking-tight text-foreground">For Facilitators</h2>
            <StepList steps={content.facilitatorSteps} />
          </div>
          <div>
            <h2 className="mb-8 text-2xl font-medium tracking-tight text-foreground">For Professionals</h2>
            <StepList steps={content.professionalSteps} />
          </div>
        </div>

        <div className="mt-20">
          <h2 className="mb-8 text-2xl font-medium tracking-tight text-foreground">What&apos;s included, for everyone</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {content.platformFeatures.map((feature) => {
              const Icon = getMarketingIcon(feature.icon);
              return (
                <div key={feature.title} className="rounded-2xl border p-6">
                  <Icon className="size-6 text-brand" strokeWidth={1.5} />
                  <p className="mt-4 font-semibold text-foreground">{feature.title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-16 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl bg-[#F5F5F5] p-8 sm:p-10">
            <h2 className="text-2xl font-medium tracking-tight text-foreground">{content.mergedTrainingCallout.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{content.mergedTrainingCallout.body}</p>
          </div>
          <div className="rounded-2xl bg-[#F5F5F5] p-8 sm:p-10">
            <h2 className="text-2xl font-medium tracking-tight text-foreground">{content.aweCallout.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{content.aweCallout.body}</p>
          </div>
        </div>

        <div className="mt-16 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <HoverRollButton href="/signup">Get started</HoverRollButton>
        </div>
      </section>
    </>
  );
}
