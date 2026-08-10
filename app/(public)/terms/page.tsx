import type { Metadata } from "next";

import { MarketingPageHeader } from "@/components/marketing/page-header";

export const metadata: Metadata = {
  title: "Terms of Use",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <>
      <MarketingPageHeader eyebrow="Legal" title="Terms of Use" />
      <section className="mx-auto max-w-[800px] px-5 py-16 sm:px-8 sm:py-20">
        <p className="text-base leading-relaxed text-muted-foreground">
          We&apos;re finalizing our full terms of use covering marketplace conduct, payments, and
          dispute handling. In the meantime, if you have questions, reach out at{" "}
          <a href="mailto:partners@usefacilit8.training" className="text-brand hover:underline">
            partners@usefacilit8.training
          </a>
          .
        </p>
      </section>
    </>
  );
}
