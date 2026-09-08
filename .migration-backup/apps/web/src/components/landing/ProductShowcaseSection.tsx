export function ProductShowcaseSection() {
  return (
    <section className="py-24 md:py-40 px-6 md:px-12 bg-secondary/30 border-t border-border">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col items-center text-center mb-24">
          <h2 className="text-4xl md:text-6xl font-serif text-foreground leading-[1.05] max-w-3xl mb-8">
            The interface to your business reality.
          </h2>
          <p className="text-xl md:text-2xl font-light text-muted-foreground max-w-2xl">
            Explore the graph, trace the evidence, and understand exactly why a
            state was inferred.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          {/* Decorative framing */}
          <div className="absolute -inset-4 md:-inset-8 border border-border/50 bg-background/50 pointer-events-none"></div>
          <div className="absolute -top-10 -left-10 w-20 h-20 border-t border-l border-primary/30 pointer-events-none"></div>
          <div className="absolute -bottom-10 -right-10 w-20 h-20 border-b border-r border-primary/30 pointer-events-none"></div>

          <img
            src="/orgni-product-ui.png"
            alt="Orgni Interface"
            className="w-full h-auto border border-border shadow-xl relative z-10"
          />
        </div>
      </div>
    </section>
  );
}
