import { motion, useReducedMotion } from "framer-motion";

/**
 * Acceleration visual: bars of increasing length sweep in left-to-right, each
 * faster than the last, until the final bar runs edge to edge. No metrics —
 * purely the feeling of throughput increasing.
 */
function AccelerationVisual({ reduced }: { reduced: boolean }) {
  const bars = Array.from({ length: 12 }, (_, i) => i);
  return (
    <div
      className="flex h-full flex-col justify-between gap-2"
      role="img"
      aria-label="Bars accelerating to full width, representing increasing throughput"
    >
      {bars.map((i) => {
        const width = 22 + (i / (bars.length - 1)) * 78;
        const duration = 1.6 - (i / (bars.length - 1)) * 1.1;
        return (
          <div key={i} className="relative h-[6px] w-full bg-white/10">
            <motion.div
              className="absolute inset-y-0 left-0 bg-white"
              style={{ width: `${width}%`, originX: 0 }}
              initial={{ scaleX: 0, opacity: 0.6 }}
              whileInView={{ scaleX: 1, opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{
                duration: reduced ? 0 : duration,
                delay: reduced ? 0 : i * 0.08,
                ease: [0.2, 0.8, 0.2, 1],
              }}
            />
            {i === bars.length - 1 && (
              <motion.div
                className="absolute inset-y-0 left-0 bg-primary"
                style={{ width: "100%", originX: 0 }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{
                  duration: reduced ? 0 : 0.5,
                  delay: reduced ? 0 : 1.2,
                  ease: [0.2, 0.8, 0.2, 1],
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function MomentumSection() {
  const reduced = useReducedMotion() ?? false;

  return (
    <section className="border-b border-border bg-foreground text-background">
      <div className="mx-auto grid max-w-[1600px] border-x border-white/20 lg:grid-cols-12">
        <div className="hidden border-r border-white/20 p-8 lg:col-span-1 lg:flex lg:flex-col lg:justify-between">
          <span className="orgni-index !text-white/55">OLX / 005</span>
          <span className="font-serif text-6xl leading-none text-primary">→</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="px-6 py-20 md:px-12 md:py-32 lg:col-span-6 lg:px-14"
        >
          <p className="orgni-kicker mb-10 text-white/70">Momentum</p>
          <h2 className="font-serif text-5xl leading-[0.98] md:text-7xl lg:text-8xl">
            Move at the speed of your ambition.
          </h2>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/70 md:text-xl">
            As organisations grow, complexity grows with them. Orgni helps
            prevent that complexity from becoming operational friction.
          </p>
          <p className="mt-10 font-mono text-sm font-bold uppercase md:text-base">
            <span className="text-white/60">Less waiting.</span>{" "}
            <span className="text-white/80">Fewer blockers.</span>{" "}
            <span className="text-primary">Faster operations.</span>
          </p>
        </motion.div>

        <div className="border-t border-white/20 p-6 md:p-10 lg:col-span-5 lg:border-l lg:border-t-0 lg:p-14">
          <div className="h-full min-h-[320px]">
            <AccelerationVisual reduced={reduced} />
          </div>
        </div>
      </div>
    </section>
  );
}
