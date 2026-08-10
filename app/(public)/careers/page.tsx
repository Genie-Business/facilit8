import type { Metadata } from "next";

import { MarketingPageHeader } from "@/components/marketing/page-header";
import { HoverRollButton } from "@/components/marketing/hover-roll-button";

export const metadata: Metadata = {
  title: "Careers",
  description: "Facilit8 is a small, early-stage team building the marketplace for corporate training in Nigeria.",
  alternates: { canonical: "/careers" },
};

export default function CareersPage() {
  return (
    <>
      <MarketingPageHeader
        eyebrow="Careers"
        title="We're not actively hiring right now."
        description="But we're always glad to hear from people who care about the problem we're solving."
      />

      <section className="mx-auto max-w-[800px] px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-base leading-relaxed text-muted-foreground">
          Facilit8 is a small, early-stage team. We don&apos;t have open roles listed at the
          moment, but if you&apos;re interested in what we&apos;re building, send us a note — we
          keep good conversations on file for when that changes.
        </p>
        <div className="mt-8">
          <HoverRollButton href="/contact">Get in touch</HoverRollButton>
        </div>
      </section>
    </>
  );
}
