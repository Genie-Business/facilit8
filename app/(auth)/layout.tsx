import Image from "next/image";
import Link from "next/link";

import { HeroBackground } from "@/components/marketing/hero-background";

// Forced dynamic (not just for /login and /reset-password/[token], which already were via
// searchParams/route params) so every auth page consistently gets the strict, nonce'd
// script-src from proxy.ts — a static page's scripts are baked in at build time with no
// nonce, so applying the nonce'd policy to a page that stays static breaks it outright.
// These are low-traffic, one-time-per-user pages, so losing static caching here costs
// little compared to what it would cost on the marketing pages.
export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-4 py-12">
      <HeroBackground />
      <Link href="/">
        <Image src="/brand/logo.png" alt="Facilit8" width={140} height={70} priority />
      </Link>
      <div className="w-full max-w-md">{children}</div>
      <Link href="/" className="text-sm text-muted-foreground hover:text-brand">
        ← Back to home
      </Link>
    </div>
  );
}
