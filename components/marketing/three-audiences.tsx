import { Building2, GraduationCap, TrendingUp } from "lucide-react";

const AUDIENCES = [
  {
    icon: Building2,
    eyebrow: "For Organisations",
    title: "Staff training that actually moves your team forward",
    body: "Post a need, compare vetted bids, and fund it securely from your wallet, or pool budget with other teams through merged training when one company can't justify it alone.",
  },
  {
    icon: GraduationCap,
    eyebrow: "For Facilitators",
    title: "Get discovered, get paid, get better",
    body: "Build a profile that shows your real track record, bid on training that matches your specialization, or propose your own merged session and invite organisations to fund it and fellow facilitators to co-deliver it.",
  },
  {
    icon: TrendingUp,
    eyebrow: "For Professionals",
    title: "Close the gap between where you are and where the market's headed",
    body: "Browse the facilitators and training shaping your industry, pool funds with peers in your field to bring in a facilitator together, and get an AI career partner grounded in real Facilit8 data.",
  },
];

export function ThreeAudiences() {
  return (
    <section className="mx-auto max-w-[1200px] px-5 py-16 sm:px-8 sm:py-20">
      <div className="mb-12 max-w-2xl">
        <span className="rounded-full border px-4 py-1.5 text-sm font-medium text-muted-foreground">
          Built for three kinds of growth
        </span>
        <h2 className="mt-6 text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl">
          One platform, three people it's actually built for.
        </h2>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {AUDIENCES.map((audience) => (
          <div key={audience.eyebrow} className="rounded-2xl border p-6">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand/10">
              <audience.icon className="size-5 text-brand-dark" />
            </div>
            <p className="mt-4 text-xs font-semibold tracking-wide text-brand-dark uppercase">{audience.eyebrow}</p>
            <p className="mt-2 font-semibold text-foreground">{audience.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{audience.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
