import type { Metadata } from "next";

import { MarketingPageHeader } from "@/components/marketing/page-header";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <>
      <MarketingPageHeader eyebrow="Legal" title="Privacy Policy" />
      <section className="mx-auto max-w-[800px] px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-base leading-relaxed text-muted-foreground">
          We&apos;re finalizing a full privacy policy covering how Facilit8 collects, stores, and
          uses your data — including identity verification (KYC) details handled through our
          payment provider. In the meantime, if you have questions about your data, reach out at{" "}
          <a href="mailto:partners@usefacilit8.training" className="text-brand hover:underline">
            partners@usefacilit8.training
          </a>
          .
        </p>
      </section>
    </>
  );
}
