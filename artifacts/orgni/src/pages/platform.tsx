import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhatItDoesSection } from "@/components/landing/WhatItDoesSection";
import { ProductShowcaseSection } from "@/components/landing/ProductShowcaseSection";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";

export default function Platform() {
  useSeo({
    title: "Platform - Orgni",
    description:
      "How Orgni turns fragmented organisational information into a continuously updated, evidence-backed model of your organisation.",
    path: "/platform",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary overflow-x-clip">
      <SiteHeader />
      <main className="flex-1">
        <WhatItDoesSection />
        <ProductShowcaseSection />
        <FinalCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
