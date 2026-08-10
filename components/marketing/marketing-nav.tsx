"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";

import { HoverRollButton } from "./hover-roll-button";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "How it works" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/careers", label: "Careers" },
  { href: "/contact", label: "Contact" },
];

export function MarketingNav() {
  const [open, setOpen] = useState(false);

  return (
    <div className="sticky top-0 z-30 px-3 pt-3 sm:px-5 sm:pt-5">
      <nav className="mx-auto flex max-w-[1200px] items-center justify-between rounded-full border bg-white/90 px-3 py-2 shadow-[0_2px_12px_rgba(0,0,0,0.06)] backdrop-blur">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center pl-2">
            <Image src="/brand/logo.png" alt="Facilit8" width={92} height={46} priority />
          </Link>
          <div className="hidden items-center gap-6 md:flex">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground transition-colors duration-300 hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Link href="/login" className="px-3 text-sm font-medium text-foreground hover:text-brand">
            Sign in
          </Link>
          <HoverRollButton href="/signup">Get started</HoverRollButton>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex size-10 items-center justify-center rounded-full bg-foreground text-background md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)}>
          <div
            className="absolute inset-x-3 bottom-3 rounded-2xl bg-white p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-1">
              {LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="py-2 text-2xl font-medium text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="text-center text-sm font-medium text-foreground"
              >
                Sign in
              </Link>
              <HoverRollButton href="/signup" className="justify-center">
                Get started
              </HoverRollButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
