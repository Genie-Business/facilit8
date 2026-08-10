import Image from "next/image";
import Link from "next/link";

import { HeroBackground } from "@/components/marketing/hero-background";

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
