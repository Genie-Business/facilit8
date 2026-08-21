import type { Metadata } from "next";

import { MarketingPageHeader } from "@/components/marketing/page-header";
import { HoverRollButton } from "@/components/marketing/hover-roll-button";
import { getMarketingPageContent } from "@/lib/services/marketing-content.service";

export const metadata: Metadata = {
  title: "Careers",
  description: "Facilit8 is a small, early-stage team building the professional development ecosystem for Nigeria's workforce.",
  alternates: { canonical: "/careers" },
};

export default async function CareersPage() {
  const content = await getMarketingPageContent("careers");

  return (
    <>
      <MarketingPageHeader
        eyebrow={content.hero.eyebrow}
        title={content.hero.title}
        description={content.hero.description}
      />

      <section className="mx-auto max-w-[800px] px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-base leading-relaxed text-muted-foreground">{content.body}</p>
        <div className="mt-8">
          <HoverRollButton href="/contact">Get in touch</HoverRollButton>
        </div>
      </section>
    </>
  );
}
