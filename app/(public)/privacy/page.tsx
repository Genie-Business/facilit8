import type { Metadata } from "next";

import { MarketingPageHeader } from "@/components/marketing/page-header";
import { getLegalPage } from "@/lib/services/legal-page.service";

export const metadata: Metadata = {
  title: "Privacy Policy",
  alternates: { canonical: "/privacy" },
};

export default async function PrivacyPage() {
  const page = await getLegalPage("privacy");

  return (
    <>
      <MarketingPageHeader eyebrow="Legal" title={page?.title ?? "Privacy Policy"} />
      <section className="mx-auto max-w-[800px] px-5 py-16 sm:px-8 sm:py-20">
        {page ? (
          <div
            className="space-y-4 text-base leading-relaxed text-muted-foreground [&_a]:text-brand [&_a]:hover:underline [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-foreground"
            dangerouslySetInnerHTML={{ __html: page.contentHtml }}
          />
        ) : (
          <p className="text-base leading-relaxed text-muted-foreground">
            We&apos;re finalizing a full privacy policy covering how Facilit8 collects, stores, and
            uses your data — including identity verification (KYC) details handled through our
            payment provider. In the meantime, if you have questions about your data, reach out at{" "}
            <a href="mailto:partners@usefacilit8.training" className="text-brand hover:underline">
              partners@usefacilit8.training
            </a>
            .
          </p>
        )}
      </section>
    </>
  );
}
