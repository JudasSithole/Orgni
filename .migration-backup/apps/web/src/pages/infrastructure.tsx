import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { InfrastructureSection } from "@/components/landing/InfrastructureSection";
import { AgentDeveloperSection } from "@/components/landing/AgentDeveloperSection";
import { TrustSection } from "@/components/landing/TrustSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";

export default function Infrastructure() {
  useSeo({
    title: "Infrastructure - Orgni",
    description:
      "Orgni works with the systems you already use, gives agents organisational context, and is built for organisational truth.",
    path: "/infrastructure",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-x-clip">
      <SiteHeader />
      <main className="flex-1 pt-[72px]">
        <section className="orgni-grid border-b border-border">
          <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
            <aside className="hidden border-r border-border p-8 lg:col-span-2 lg:flex lg:flex-col lg:justify-between">
              <span className="orgni-index">ORG / INF-01</span>
              <span className="font-serif text-6xl text-primary">I</span>
            </aside>
            <div className="px-6 py-20 md:px-12 md:py-28 lg:col-span-10">
              <p className="orgni-kicker mb-10">
                Organisational intelligence infrastructure
              </p>
              <h1 className="max-w-5xl font-serif text-5xl leading-[0.98] md:text-7xl lg:text-8xl">
                The context layer between systems and decisions.
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                Orgni turns fragmented business records into a live,
                evidence-backed model that people, applications, and AI can
                query.
              </p>
            </div>
          </div>
        </section>
        <InfrastructureSection />
        <AgentDeveloperSection />
        <TrustSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
