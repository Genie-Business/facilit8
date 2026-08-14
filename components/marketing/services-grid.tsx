import { Gavel, Wallet, MessageCircle, Handshake, Sparkles } from "lucide-react";

const SERVICES = [
  { icon: Gavel, title: "Bidding & matching", body: "Post or browse training needs, compare proposals, and select with real data, not cold outreach." },
  { icon: Wallet, title: "Secure escrow wallet", body: "Budget sits in escrow until training is confirmed complete. Funds never move on a handshake." },
  { icon: MessageCircle, title: "In-app chat", body: "Align on scope, dates, and delivery before anyone commits budget or accepts a bid." },
  { icon: Handshake, title: "Merged training", body: "Organisations, Professionals, and Facilitators can all propose a session and invite others to co-fund or co-deliver it, not just one company's budget." },
  { icon: Sparkles, title: "Awé, AI growth partner", body: "Ask Awé about your career: a growth partner for Professionals, Facilitators, and Event Managers, grounded in real Facilit8 data." },
];

export function ServicesGrid() {
  return (
    <section className="bg-[#F5F5F5] py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="mb-12 max-w-2xl">
          <span className="rounded-full border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-muted-foreground">
            Everything you need
          </span>
          <h2 className="mt-6 text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl">
            The whole engagement, in one place.
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <div key={service.title} className="rounded-2xl bg-white p-6">
              <service.icon className="size-6 text-brand" strokeWidth={1.5} />
              <p className="mt-4 font-semibold text-foreground">{service.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{service.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
