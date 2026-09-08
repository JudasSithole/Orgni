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
    <section className="orgni-grid border-b border-border pt-[72px]">
      <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1600px] border-x border-border lg:grid-cols-12">
        <aside className="hidden border-r border-border p-8 lg:col-span-1 lg:flex lg:flex-col lg:justify-between">
          <span className="orgni-index">OLX / 001</span>
          <span className="font-serif text-6xl leading-none text-primary">
            O
          </span>
        </aside>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="flex flex-col justify-center px-6 py-16 md:px-12 md:py-24 lg:col-span-6 lg:px-14"
        >
          <p className="orgni-kicker mb-10">Olyxee</p>
          <h1 className="font-serif text-5xl leading-[0.98] md:text-7xl lg:text-[5.5rem]">
            Operational intelligence for businesses in motion.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Olyxee builds infrastructure that helps organisations understand
            what is happening, reduce operational friction, and keep work
            moving.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href={ORGNI_PRODUCT_URL}
              className="inline-flex min-h-14 items-center justify-between gap-8 bg-primary px-6 font-mono text-xs font-bold uppercase text-primary-foreground transition-colors hover:bg-foreground"
            >
              Explore Orgni
              <ArrowUpRight className="h-5 w-5" />
            </Link>
            <a
              href={OLYXEE_URL}
              className="inline-flex min-h-14 items-center justify-between gap-8 border border-border bg-background px-6 font-mono text-xs font-bold uppercase transition-colors hover:border-foreground"
            >
              About Olyxee
              <ArrowUpRight className="h-5 w-5" />
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative flex min-h-[420px] flex-col justify-between overflow-hidden border-t border-border bg-foreground p-6 text-background lg:col-span-5 lg:min-h-0 lg:border-l lg:border-t-0 lg:p-8"
        >
          <div className="flex items-center justify-between">
            <span className="orgni-index !text-white/55">Flagship product</span>
            <span className="font-mono text-xs font-bold uppercase text-white/70">
              Orgni
            </span>
          </div>
          <div className="my-6 flex-1">
            <FlowVisual reduced={reduced} />
          </div>
          <div className="grid grid-cols-3 gap-px border-t border-white/20 pt-5 font-mono text-[11px] font-bold uppercase text-white/55">
            <span>Fragmented</span>
            <span className="text-center">Understood</span>
            <span className="text-right text-primary">Moving</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
