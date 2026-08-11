import { MarketingNav } from "@/components/marketing/marketing-nav";
import { MarketingFooter } from "@/components/marketing/marketing-footer";

// Inter is loaded once in the root layout (app/layout.tsx) rather than here — scoped to
// just the public marketing site via this wrapper's font-family override, which cascades
// to descendants (via normal CSS inheritance) without touching the authenticated app
// shell. Headings that want Urbanist set it directly (Tailwind v4's `@theme inline` bakes
// utility classes to a static value at build time, so a runtime CSS-variable override on
// this wrapper can't retarget the `font-heading` utility class the way inheritance can for
// a plain `font-family` declaration).
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ fontFamily: "var(--font-inter), var(--font-sans)" }}>
      <MarketingNav />
      <main className="flex-1">{children}</main>
      <MarketingFooter />
    </div>
  );
}
