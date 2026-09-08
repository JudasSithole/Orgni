import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { ORGNI_PRODUCT_URL, OLYXEE_URL } from "@/lib/links";

/**
 * Abstract "organisation accelerating" visual: a set of operational lanes
 * that start fragmented and converge into a single fast-moving stream.
 */
function FlowVisual({ reduced }: { reduced: boolean }) {
  const lanes = [
    { d: "M0 60 C 180 60, 260 210, 520 210", delay: 0 },
    { d: "M0 135 C 200 135, 280 210, 520 210", delay: 0.6 },
    { d: "M0 210 C 220 210, 300 210, 520 210", delay: 1.2 },
    { d: "M0 285 C 200 285, 280 210, 520 210", delay: 0.9 },
    { d: "M0 360 C 180 360, 260 210, 520 210", delay: 0.3 },
  ];

  return (
    <svg
      viewBox="0 0 520 420"
      className="h-full w-full"
      role="img"
      aria-label="Fragmented streams of work converging into one continuous flow"
    >
      <defs>
        <linearGradient id="lane-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="white" stopOpacity="0.08" />
          <stop offset="1" stopColor="white" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {lanes.map((lane) => (
        <g key={lane.d}>
          <path
            d={lane.d}
            fill="none"
            stroke="url(#lane-fade)"
            strokeWidth="1"
          />
          {!reduced && (
            <motion.circle
              r="3.5"
              fill="hsl(19 99% 50%)"
              initial={{ offsetDistance: "0%", opacity: 0 }}
              animate={{
                offsetDistance: ["0%", "100%"],
                opacity: [0, 1, 1, 0],
              }}
              transition={{
                duration: 3.6,
                delay: lane.delay,
                repeat: Infinity,
                ease: [0.4, 0, 0.2, 1],
              }}
              style={{ offsetPath: `path("${lane.d}")` }}
            />
          )}
        </g>
      ))}

      {/* Throughput marks where the lanes become one stream */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <motion.rect
          key={i}
          x={440 + i * 12}
          y={204}
          width="6"
          height="12"
          fill="hsl(19 99% 50%)"
          initial={{ opacity: 0.15 }}
          animate={reduced ? undefined : { opacity: [0.15, 1, 0.15] }}
          transition={{
            duration: 1.8,
            delay: i * 0.15,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </svg>
  );
}

export function MotionHero() {
  const reduced = useReducedMotion() ?? false;

  return (
    <section className="pt-[72px]">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        >
          <h1 className="font-serif text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
            Operational intelligence for businesses in motion.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Orgni helps your organisation understand what is happening and keep
            work moving.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={ORGNI_PRODUCT_URL} className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-primary">
              Explore Orgni
              <ArrowUpRight className="h-4 w-4" />
            </Link>
            <a href={OLYXEE_URL} className="inline-flex h-12 items-center gap-2 rounded-full border border-border px-6 text-sm font-medium transition-colors hover:border-foreground">
              About Olyxee
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative aspect-[520/420] overflow-hidden rounded-2xl bg-foreground p-6 md:p-8"
        >
          <FlowVisual reduced={reduced} />
        </motion.div>
      </div>
    </section>
  );
}
