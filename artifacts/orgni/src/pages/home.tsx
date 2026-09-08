import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { MotionHero } from "@/components/landing/motion-page/MotionHero";
import { FrictionSection } from "@/components/landing/motion-page/FrictionSection";
import { OrgniSection } from "@/components/landing/motion-page/OrgniSection";
import { ExperienceSection } from "@/components/landing/motion-page/ExperienceSection";
import { MomentumSection } from "@/components/landing/motion-page/MomentumSection";
import { UseCasesSection } from "@/components/landing/motion-page/UseCasesSection";
import { IndependenceSection } from "@/components/landing/motion-page/IndependenceSection";
import { DirectionSection } from "@/components/landing/motion-page/DirectionSection";
import { KeepMovingCta } from "@/components/landing/motion-page/KeepMovingCta";

export default function Home() {
  useSeo({
    title: "Orgni - Operational intelligence for businesses in motion",
    description:
      "Orgni is an AI operational layer for your business. Ask it for work in Teams, Slack or email and it gathers the context, works across your systems, and returns the finished result. Built by Olyxee.",
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
        <IndependenceSection />
        <DirectionSection />
        <KeepMovingCta />
      </main>

      <SiteFooter />
    </div>
  );
}
