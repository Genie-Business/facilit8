import type { Metadata } from "next";

import { MarketingPageHeader } from "@/components/marketing/page-header";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about payments, KYC verification, and merged training on Facilit8.",
  alternates: { canonical: "/faq" },
};

const FAQS = [
  {
    q: "How does payment work?",
    a: "Event Managers fund a training's budget into their Facilit8 wallet before a facilitator is confirmed. The funds are held until the training is marked complete, at which point they're released to the facilitator, minus a platform fee.",
  },
  {
    q: "Do I need to verify my identity?",
    a: "Yes. Both Event Managers and Facilitators complete a short identity verification (KYC) step before their wallet can send or receive funds. This keeps the marketplace accountable on both sides.",
  },
  {
    q: "What is merged training?",
    a: "Merged training lets multiple companies pool their budgets to jointly fund a single training session that no one company could afford alone. Participants split the cost by delegate count and vote together on which facilitator to select.",
  },
  {
    q: "How are facilitators vetted?",
    a: "Facilitators build a profile with their specialization, qualifications, and experience, and collect reviews after every completed engagement — so Event Managers can see a track record, not just a bid.",
  },
  {
    q: "Can I message a facilitator before hiring them?",
    a: "Yes, through Facilit8's built-in chat. Event Managers unlock a conversation with a facilitator for a set access period, so you can align on details before committing budget.",
  },
  {
    q: "What happens if a training doesn't go ahead?",
    a: "If a facilitator isn't selected or a session doesn't complete, funded budget stays in your wallet rather than being paid out — you're only charged once a training is confirmed complete.",
  },
];

export default function FaqPage() {
  return (
    <>
      <MarketingPageHeader eyebrow="FAQ" title="Common questions" />

      <section className="mx-auto max-w-[800px] px-5 py-16 sm:px-8 sm:py-20">
        <div className="divide-y">
          {FAQS.map((item) => (
            <div key={item.q} className="py-6">
              <p className="font-semibold text-foreground">{item.q}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
