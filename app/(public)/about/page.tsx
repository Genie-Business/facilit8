import type { Metadata } from "next";

import { MarketingPageHeader } from "@/components/marketing/page-header";
import { HoverRollButton } from "@/components/marketing/hover-roll-button";
import { getMarketingPageContent } from "@/lib/services/marketing-content.service";
import { getMarketingIcon } from "@/lib/data/marketing-icons";

export const metadata: Metadata = {
  title: "About Us",
  description:
    "Facilit8 is Nigeria's professional development ecosystem, where organizations staff vetted training, facilitators get discovered and paid, and every professional grows with Awé.",
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const content = await getMarketingPageContent("about");

  return (
    <>
      <MarketingPageHeader
        eyebrow={content.hero.eyebrow}
        title={content.hero.title}
        description={content.hero.description}
      />

      <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-medium tracking-tight text-foreground sm:text-3xl">{content.missionHeading}</h2>
          <p className="mt-4 text-xl leading-snug font-medium text-foreground sm:text-2xl">{content.missionLead}</p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">{content.missionBody}</p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-3">
          {content.values.map((value) => {
            const Icon = getMarketingIcon(value.icon);
            return (
              <div key={value.title}>
                <Icon className="size-8 text-brand" strokeWidth={1.5} />
                <p className="mt-4 font-semibold text-foreground">{value.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{value.body}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-16">
          <HoverRollButton href="/signup">Join Facilit8</HoverRollButton>
        </div>
      </section>
    </>
  );
}
