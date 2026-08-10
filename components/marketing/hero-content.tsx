"use client";

import { motion } from "framer-motion";

import { HoverRollButton } from "./hover-roll-button";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function HeroContent() {
  return (
    <div className="relative z-10 flex flex-col items-center px-5 pt-20 pb-24 text-center sm:pt-28 sm:pb-32">
      <motion.span
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 inline-flex items-center gap-1.5 rounded-full border bg-white px-4 py-1.5 text-sm text-muted-foreground"
      >
        For Event Managers &amp; Facilitators
      </motion.span>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="max-w-3xl text-5xl leading-[1.05] font-medium tracking-tight text-foreground sm:text-6xl lg:text-[4.5rem]"
      >
        Book the <em className="text-brand not-italic">right</em> trainer, every time.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-5 max-w-[600px] text-base leading-relaxed text-muted-foreground sm:text-lg"
      >
        Facilit8 connects corporate Event Managers with vetted training Facilitators — post a
        training need, review bids, and fund it securely through a built-in wallet.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-8 flex flex-col items-center gap-3 sm:flex-row"
      >
        <HoverRollButton href="/signup">Get started</HoverRollButton>
        <Button variant="outline" className="rounded-full" render={<Link href="/services" />} nativeButton={false}>
          See how it works
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.45 }}
        className="mt-16 grid w-full max-w-3xl grid-cols-1 gap-6 sm:grid-cols-3"
      >
        {[
          { step: "1", title: "Post your need", desc: "Share your training goals, dates, and budget." },
          { step: "2", title: "Review bids", desc: "Compare proposals from vetted facilitators." },
          { step: "3", title: "Fund & go", desc: "Pay securely through your Facilit8 wallet." },
        ].map((item) => (
          <div key={item.step} className="rounded-2xl border bg-white/70 p-5 text-left backdrop-blur">
            <span className="flex size-8 items-center justify-center rounded-full bg-brand/10 text-sm font-semibold text-brand-dark">
              {item.step}
            </span>
            <p className="mt-3 text-sm font-semibold text-foreground">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </motion.div>
    </div>
  );
}
