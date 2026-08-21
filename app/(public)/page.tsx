import type { Metadata } from "next";

import { Hero } from "@/components/marketing/hero";
import { ThreeAudiences } from "@/components/marketing/three-audiences";
import { VideoShowcase } from "@/components/marketing/video-showcase";
import { ServicesGrid } from "@/components/marketing/services-grid";
import { MissionSection } from "@/components/marketing/mission-section";
import { AweSection } from "@/components/marketing/awe-section";
import { CategoryTicker } from "@/components/marketing/category-ticker";
import { getMarketingPageContent } from "@/lib/services/marketing-content.service";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const content = await getMarketingPageContent("home");

  return (
    <>
      <Hero content={content.hero} />
      <ThreeAudiences eyebrow={content.audiencesEyebrow} title={content.audiencesTitle} audiences={content.audiences} />
      <VideoShowcase />
      <ServicesGrid eyebrow={content.servicesEyebrow} title={content.servicesTitle} services={content.services} />
      <MissionSection eyebrow={content.missionEyebrow} title={content.missionTitle} body={content.missionBody} />
      <AweSection content={content.awe} />
      <CategoryTicker />
    </>
  );
}
