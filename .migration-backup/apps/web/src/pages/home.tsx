import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroSection } from "@/components/landing/HeroSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { InfrastructureSection } from "@/components/landing/InfrastructureSection";
import { IntegrationsSection } from "@/components/landing/IntegrationsSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";

export default function Home() {
  useSeo({
    title: "Orgni - Organisational intelligence infrastructure",
    description:
      "Orgni creates and maintains the shared organisational context that humans, applications and AI agents need to understand and operate within a business reliably.",
    path: "/",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-x-clip">
      <SiteHeader />

      <main className="flex-1">
        <HeroSection />
        <section className="border-b border-border">
          <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
            <div className="border-b border-border p-6 lg:col-span-3 lg:border-b-0 lg:border-r lg:p-8">
              <span className="orgni-index">ORG / PRINCIPLE 01</span>
            </div>
            <div className="p-6 md:p-10 lg:col-span-9 lg:p-12">
              <h2 className="max-w-5xl font-serif text-3xl leading-tight md:text-5xl">
                One trusted operational context, with every source still
                attached.
              </h2>
            </div>
          </div>
        </section>
        <ProblemSection />
        <InfrastructureSection />
        <section className="border-b border-border bg-foreground text-background">
          <div className="mx-auto grid max-w-[1600px] border-x border-white/20 lg:grid-cols-12">
            <div className="border-b border-white/20 p-6 lg:col-span-3 lg:border-b-0 lg:border-r lg:p-8">
              <span className="orgni-index !text-white/55">
                CURRENT / CAPABILITY
              </span>
            </div>
            <div className="p-6 md:p-10 lg:col-span-9 lg:p-12">
              <h2 className="max-w-4xl text-3xl font-semibold md:text-5xl">
                Structured context begins with traceable evidence.
              </h2>
              <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/70">
                Orgni currently begins with invoices, proofs of payment and
                contracts, converting them into structured, traceable
                organisational facts. Additional source connectors are being
                developed and are not presented as active today.
              </p>
            </div>
          </div>
        </section>
        <IntegrationsSection />
        <FinalCtaSection />
      </main>

      <SiteFooter />
    </div>
  );
}
