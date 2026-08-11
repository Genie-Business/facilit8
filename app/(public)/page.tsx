import type { Metadata } from "next";

import { Hero } from "@/components/marketing/hero";
import { ThreeAudiences } from "@/components/marketing/three-audiences";
import { VideoShowcase } from "@/components/marketing/video-showcase";
import { ServicesGrid } from "@/components/marketing/services-grid";
import { MissionSection } from "@/components/marketing/mission-section";
import { AweSection } from "@/components/marketing/awe-section";
import { CategoryTicker } from "@/components/marketing/category-ticker";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <ThreeAudiences />
      <VideoShowcase />
      <ServicesGrid />
      <MissionSection />
      <AweSection />
      <CategoryTicker />
    </>
  );
}
