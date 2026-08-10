import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Users2 } from "lucide-react";

import { HeroBackground } from "@/components/marketing/hero-background";
import { HeroContent } from "@/components/marketing/hero-content";
import { HoverRollButton } from "@/components/marketing/hover-roll-button";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative">
        <HeroBackground />
        <HeroContent />
      </section>

      {/* About */}
      <section className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 sm:py-28">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
            1
          </span>
          <span className="rounded-full border px-4 py-1.5 text-sm font-medium text-muted-foreground">
            Introducing Facilit8
          </span>
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl">
              Corporate training, run without the back-and-forth.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Sourcing a facilitator used to mean spreadsheets, cold emails, and manual invoicing.
              Facilit8 puts the whole process — sourcing, bidding, messaging, and payment — in one
              place, so Event Managers can staff a training in days, not weeks.
            </p>
            <div className="mt-8">
              <HoverRollButton href="/about">About us</HoverRollButton>
            </div>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-light via-brand to-brand-dark">
            <div className="absolute inset-0 flex items-center justify-center">
              <Users2 className="size-24 text-white/25" strokeWidth={1} />
            </div>
          </div>
        </div>
      </section>

      {/* Why Facilit8 */}
      <section className="bg-[#F5F5F5] py-20 sm:py-28">
        <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
              2
            </span>
            <span className="rounded-full border border-gray-300 px-4 py-1.5 text-sm font-medium text-muted-foreground">
              Why Facilit8
            </span>
          </div>

          <h2 className="mb-12 max-w-2xl text-3xl leading-tight font-medium tracking-tight text-foreground sm:text-4xl">
            Built for how corporate training actually gets sourced.
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a2b30] to-[#0d1719]">
              <div className="absolute inset-0 flex items-center justify-center">
                <ShieldCheck className="size-20 text-white/15" strokeWidth={1} />
              </div>
              <Link
                href="/about"
                className="absolute bottom-4 left-4 flex h-9 w-9 items-center overflow-hidden rounded-full bg-white transition-all duration-300 ease-in-out group-hover:w-[148px]"
              >
                <span className="flex w-9 shrink-0 items-center justify-center">
                  <ArrowRight className="size-3.5 -rotate-45 transition-transform duration-300 group-hover:rotate-0" />
                </span>
                <span className="pr-4 text-sm font-medium whitespace-nowrap text-foreground opacity-0 transition-opacity delay-100 duration-300 group-hover:opacity-100">
                  Learn more
                </span>
              </Link>
              <div className="absolute top-4 left-4 text-sm font-medium text-white/90">Vetted facilitators</div>
            </div>

            <div className="group relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-dark">
              <div className="absolute inset-0 flex items-center justify-center">
                <Users2 className="size-20 text-white/15" strokeWidth={1} />
              </div>
              <Link
                href="/signup"
                className="absolute bottom-4 left-4 flex h-9 w-9 items-center overflow-hidden rounded-full bg-foreground transition-all duration-300 ease-in-out group-hover:w-[168px]"
              >
                <span className="flex w-9 shrink-0 items-center justify-center">
                  <ArrowRight className="size-3.5 -rotate-45 text-white transition-transform duration-300 group-hover:rotate-0" />
                </span>
                <span className="pr-4 text-sm font-medium whitespace-nowrap text-white opacity-0 transition-opacity delay-100 duration-300 group-hover:opacity-100">
                  Get started free
                </span>
              </Link>
              <div className="absolute top-4 left-4 text-sm font-medium text-white/90">Secure escrow payments</div>
            </div>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Facilitators are reviewed after every engagement, and funds only move once both sides
            confirm — so budget never sits with a training that hasn&apos;t happened yet.
          </p>
        </div>
      </section>
    </>
  );
}
