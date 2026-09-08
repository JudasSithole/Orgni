import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Left: complexity growing (a widening lattice of people, systems, messages).
 * Right: the same volume passing smoothly through one operational layer.
 */
function ComplexityVisual({ reduced }: { reduced: boolean }) {
  const rows = [3, 5, 8, 12];
  const nodes: { x: number; y: number; r: number }[] = [];
  rows.forEach((count, rowIndex) => {
    const y = 40 + rowIndex * 90;
    for (let i = 0; i < count; i += 1) {
      const x = 40 + ((i + 0.5) / count) * 440;
      nodes.push({ x, y, r: 4 });
    }
  });

  return (
    <svg
      viewBox="0 0 520 380"
      className="h-full w-full"
      role="img"
      aria-label="An organisation growing from a few people into many interdependent systems"
    >
      {rows.slice(0, -1).map((count, rowIndex) => {
        const next = rows[rowIndex + 1];
        const lines: ReactNode[] = [];
        for (let i = 0; i < count; i += 1) {
          const x1 = 40 + ((i + 0.5) / count) * 440;
          const y1 = 40 + rowIndex * 90;
          for (let j = 0; j < next; j += 1) {
            if (Math.abs(i / count - j / next) > 0.28) continue;
            const x2 = 40 + ((j + 0.5) / next) * 440;
            const y2 = 40 + (rowIndex + 1) * 90;
            lines.push(
              <line
                key={`${rowIndex}-${i}-${j}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="hsl(0 0% 7% / 0.14)"
                strokeWidth="1"
              />,
            );
          }
        }
        return <g key={rowIndex}>{lines}</g>;
      })}
      {nodes.map((n, i) => (
        <motion.circle
          key={i}
          cx={n.x}
          cy={n.y}
          r={n.r}
          fill="hsl(0 0% 7%)"
          initial={{ opacity: 0.25 }}
          whileInView={reduced ? { opacity: 1 } : { opacity: [0.25, 1] }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.02 * i }}
        />
      ))}
      <text
        x="40"
        y="372"
        className="fill-muted-foreground"
        fontFamily="Geist Mono, monospace"
        fontSize="11"
        fontWeight="700"
      >
        PEOPLE · SYSTEMS · MESSAGES · DOCUMENTS · DEPARTMENTS
      </text>
    </svg>
  );
}

function FlowThroughVisual({ reduced }: { reduced: boolean }) {
  const inputs = [50, 110, 170, 230, 290];
  return (
    <svg
      viewBox="0 0 520 380"
      className="h-full w-full"
      role="img"
      aria-label="Many inputs moving smoothly through one operational layer into continuous work"
    >
      {inputs.map((y, i) => {
        const d = `M0 ${y} C 140 ${y}, 160 170, 240 170`;
        return (
          <g key={y}>
            <path d={d} fill="none" stroke="hsl(0 0% 7% / 0.18)" />
            {!reduced && (
              <motion.circle
                r="3"
                fill="hsl(0 0% 7%)"
                initial={{ offsetDistance: "0%", opacity: 0 }}
                whileInView={{
                  offsetDistance: ["0%", "100%"],
                  opacity: [0, 1, 1, 0],
                }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{
                  duration: 2.4,
                  delay: i * 0.35,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{ offsetPath: `path("${d}")` }}
              />
            )}
          </g>
        );
      })}

      {/* The operational layer */}
      <rect x="240" y="120" width="48" height="100" fill="hsl(19 99% 50%)" />
      <text
        x="264"
        y="242"
        textAnchor="middle"
        fontFamily="Geist Mono, monospace"
        fontSize="11"
        fontWeight="700"
        className="fill-foreground"
      >
        ORGNI
      </text>

      {/* One smooth stream out */}
      <path d="M288 170 H 520" stroke="hsl(19 99% 50%)" strokeWidth="2" />
      {[0, 1, 2, 3].map((i) => (
        <motion.circle
          key={i}
          r="3.5"
          fill="hsl(19 99% 50%)"
          initial={{ cx: 300, opacity: 0 }}
          animate={reduced ? { cx: 380 + i * 40, opacity: 1 } : { cx: [300, 520], opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 1.6,
            delay: i * 0.4,
            repeat: Infinity,
            ease: "linear",
          }}
          cy={170}
        />
      ))}
      <text
        x="520"
        y="372"
        textAnchor="end"
        className="fill-muted-foreground"
        fontFamily="Geist Mono, monospace"
        fontSize="11"
        fontWeight="700"
      >
        WORK KEEPS MOVING
      </text>
    </svg>
  );
}

export function FrictionSection() {
  const reduced = useReducedMotion() ?? false;

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1600px] border-x border-border">
        <div className="grid lg:grid-cols-12">
          <div className="border-b border-border p-6 lg:col-span-3 lg:border-b-0 lg:border-r lg:p-8">
            <span className="orgni-index">OLX / 002 — GROWTH</span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="px-6 py-16 md:px-12 md:py-24 lg:col-span-9"
          >
            <h2 className="max-w-4xl font-serif text-4xl leading-[1.02] md:text-6xl">
              Growth should not create friction.
            </h2>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              As businesses grow, so do the people, systems, conversations,
              decisions, and dependencies required to keep them running.
            </p>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed md:text-xl">
              Work should not stop because someone is waiting for an answer, a
              document, an approval, an update, or another person.
            </p>
          </motion.div>
        </div>

        <div className="grid border-t border-border md:grid-cols-2">
          <div className="border-b border-border p-6 md:border-b-0 md:border-r md:p-10">
            <p className="orgni-index mb-6">Without an operational layer</p>
            <div className="aspect-[520/380]">
              <ComplexityVisual reduced={reduced} />
            </div>
          </div>
          <div className="p-6 md:p-10">
            <p className="orgni-index mb-6 !text-primary">With Orgni</p>
            <div className="aspect-[520/380]">
              <FlowThroughVisual reduced={reduced} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
