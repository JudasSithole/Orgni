import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MotionHero } from "@/components/landing/motion-page/MotionHero";
import { FrictionSection } from "@/components/landing/motion-page/FrictionSection";
import { OrgniSection } from "@/components/landing/motion-page/OrgniSection";
import { ExperienceSection } from "@/components/landing/motion-page/ExperienceSection";
import { MomentumSection } from "@/components/landing/motion-page/MomentumSection";
import { UseCasesSection } from "@/components/landing/motion-page/UseCasesSection";
import { InfrastructureStorySection } from "@/components/landing/motion-page/InfrastructureStorySection";
import { IndependenceSection } from "@/components/landing/motion-page/IndependenceSection";
import { DirectionSection } from "@/components/landing/motion-page/DirectionSection";
import { ResearchSection } from "@/components/landing/motion-page/ResearchSection";
import { KeepMovingCta } from "@/components/landing/motion-page/KeepMovingCta";

export default function Home() {
  useSeo({
    title: "Olyxee - Operational intelligence for businesses in motion",
    description:
      "Olyxee builds operational intelligence infrastructure that helps organisations understand what is happening, reduce operational friction, and keep work moving. Orgni is its flagship product.",
    path: "/",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-x-clip">
      <SiteHeader />

      <main className="flex-1">
        <MotionHero />
        <FrictionSection />
        <OrgniSection />
        <ExperienceSection />
        <MomentumSection />
        <UseCasesSection />
        <InfrastructureStorySection />
        <IndependenceSection />
        <DirectionSection />
        <ResearchSection />
        <KeepMovingCta />
      </main>

      <SiteFooter />
    </div>
  );
}
