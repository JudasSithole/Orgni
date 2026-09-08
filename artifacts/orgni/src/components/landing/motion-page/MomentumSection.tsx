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
    <section className="bg-foreground text-background">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
        <motion.div initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}>
          <h2 className="font-serif text-3xl leading-tight tracking-tight md:text-5xl">
            Move at the speed of your ambition.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-white/70">
            Less waiting. Fewer blockers. Faster operations.
          </p>
        </motion.div>
        <div className="h-[280px] md:h-[320px]">
          <AccelerationVisual reduced={reduced} />
        </div>
      </div>
    </section>
  );
}
