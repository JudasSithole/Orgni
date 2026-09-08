export function TrustSection() {
  const principles = [
    "Evidence backs every assertion.",
    "State is computed, never manually entered.",
    "History is immutable and auditable.",
    "Policies are explicit and computable.",
  ];

  return (
    <section className="border-b border-border bg-foreground text-background">
      <div className="mx-auto max-w-[1600px] border-x border-background/20 px-6 py-24 md:px-12 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8">
          <div className="lg:col-span-5">
            <h2 className="text-4xl md:text-6xl font-serif leading-[1.05] mb-12">
              Confidence & Integrity
            </h2>
            <div className="h-px w-full bg-background/20 mb-12"></div>
            <p className="text-xl md:text-2xl font-light text-background/80 leading-snug">
              An operational model is only valuable if it is trusted. Orgni is
              built on principles of verifiable truth.
            </p>
          </div>

          <div className="lg:col-span-6 lg:col-start-7 pt-4 lg:pt-16">
            <div className="space-y-0 border-t border-background/20">
              {principles.map((principle, i) => (
                <div
                  key={i}
                  className="flex items-start gap-8 py-8 border-b border-background/20 group"
                >
                  <span className="font-mono text-sm text-primary mt-1 shrink-0 group-hover:text-background transition-colors">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p className="text-2xl md:text-3xl font-light tracking-tight text-background/90 group-hover:text-background transition-colors">
                    {principle}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
