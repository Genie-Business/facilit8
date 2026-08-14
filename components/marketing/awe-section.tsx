import { Sparkles, MessageCircle, TrendingUp } from "lucide-react";

import { HoverRollButton } from "./hover-roll-button";

const BULLETS = [
  "Grounded in real Facilit8 data: training events, facilitators, and merged trainings, never invented answers.",
  "Builds a career profile over time, so every conversation picks up where the last one left off.",
  "Closing a skills gap is how pay and opportunity catch up. Awé helps you find the shortest real path there.",
  "For Professionals, Facilitators, and Event Managers, whichever side of the marketplace you're on.",
];

export function AweSection() {
  return (
    <section className="bg-[#F5F5F5] py-20 sm:py-28">
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 px-5 sm:px-8 lg:grid-cols-2 lg:gap-16">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-white px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="size-3.5 text-brand" />
            Meet Awé
          </span>
          <h2 className="mt-6 text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl">
            Awé understands your professional journey.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground">
            Ask Awé where you stand, where you&apos;re headed, and what closes the gap between
            them, grounded in real Facilit8 data, not generic advice.
          </p>
          <ul className="mt-6 space-y-3">
            {BULLETS.map((bullet) => (
              <li key={bullet} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand" />
                {bullet}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <HoverRollButton href="/signup">Talk to Awé</HoverRollButton>
          </div>
        </div>

        <div className="relative aspect-square max-w-md overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2b30] to-[#0d1719] p-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <MessageCircle className="size-28 text-white/10" strokeWidth={1} />
          </div>
          <div className="relative flex h-full flex-col justify-end gap-3">
            <div className="ml-auto max-w-[75%] rounded-2xl rounded-br-sm bg-brand px-4 py-2.5 text-sm text-[#0a1f22]">
              I want to move from Facilitator to Lead Trainer within a year.
            </div>
            <div className="mr-auto flex max-w-[80%] items-start gap-2 rounded-2xl rounded-bl-sm bg-white/10 px-4 py-2.5 text-sm text-white">
              <TrendingUp className="mt-0.5 size-4 shrink-0 text-brand-light" />
              Based on your last 6 engagements, you're ready: here's the gap and what closes it.
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
