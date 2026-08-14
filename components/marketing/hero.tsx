"use client";

import { motion } from "framer-motion";
import { MousePointer2 } from "lucide-react";

import { useTypewriter } from "@/lib/hooks/use-typewriter";
import { HoverRollButton } from "./hover-roll-button";
import { RotatingBorderButton } from "./rotating-border-button";
import { HeroOrbit } from "./hero-orbit";

const HEADLINE = "Grow Your Career. Staff Your Team. Meet Awé.";
const HIGHLIGHT_START = HEADLINE.indexOf("Meet Awé");

function TypewriterHeading() {
  const { displayed, done } = useTypewriter(HEADLINE, 35, 400);
  const before = displayed.slice(0, Math.min(displayed.length, HIGHLIGHT_START));
  const highlighted = displayed.slice(HIGHLIGHT_START, displayed.length);

  return (
    <h1
      className="text-[40px] leading-[1.1] font-semibold tracking-tight text-white sm:text-5xl lg:text-[56px]"
      style={{ fontFamily: "var(--font-urbanist), var(--font-sans)" }}
    >
      {before}
      <span className="text-brand-light">{highlighted}</span>
      {!done && <span className="typewriter-cursor h-[0.9em] align-middle" aria-hidden="true" />}
    </h1>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden px-5 pt-32 pb-20 sm:px-8 sm:pt-40 sm:pb-28">
      <div className="hero-dark-bg" />

      <div className="relative z-10 mx-auto flex max-w-[1280px] flex-col items-center gap-16 lg:flex-row lg:items-center lg:justify-between">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 lg:max-w-[560px]"
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-sm text-white/70">
            The Professional Development Ecosystem
          </span>

          <div className="mt-6">
            <TypewriterHeading />
          </div>

          <p className="mt-5 max-w-[480px] text-base leading-relaxed text-white/60 sm:text-lg">
            Facilit8 is where professionals grow their careers, organizations staff vetted
            training, and facilitators get discovered and paid, all guided by Awé, your AI
            partner for what&apos;s next.
          </p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 3.2 }}
            className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
          >
            <RotatingBorderButton href="/signup">Get started</RotatingBorderButton>
            <HoverRollButton href="/services" variant="outline-dark">
              See how it works
            </HoverRollButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 3.6 }}
            className="mt-10 ml-[80px] flex items-center gap-2 sm:ml-[180px]"
          >
            <MousePointer2 className="size-5 fill-brand text-brand" />
            <span className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-[#0a1f22]">
              New bid from Amaka
            </span>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1"
        >
          <HeroOrbit />
        </motion.div>
      </div>
    </section>
  );
}
