import type { Metadata } from "next";

import { MarketingPageHeader } from "@/components/marketing/page-header";
import { listOrderedFaqs } from "@/lib/services/faq.service";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about payments, KYC verification, and merged training on Facilit8.",
  alternates: { canonical: "/faq" },
};

export default async function FaqPage() {
  const faqs = await listOrderedFaqs();

  return (
    <>
      <MarketingPageHeader eyebrow="FAQ" title="Common questions" />

      <section className="mx-auto max-w-[800px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="divide-y">
          {faqs.map((item) => (
            <div key={item.id} className="py-6">
              <p className="font-semibold text-foreground">{item.question}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
