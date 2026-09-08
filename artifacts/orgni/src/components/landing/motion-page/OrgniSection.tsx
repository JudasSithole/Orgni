import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { ORGNI_PRODUCT_URL } from "@/lib/links";

const valuePoints = [
  "Find answers without chasing people",
  "Give Orgni work directly",
  "Reduce repetitive internal requests",
  "Handle routine customer requests",
  "Identify blockers and dependencies",
  "Coordinate work across business systems",
  "Reduce unnecessary handoffs",
  "Keep teams moving",
];

export function OrgniSection() {
  return (
    <section id="orgni" className="scroll-mt-20 border-b border-border">
      <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="px-6 py-16 md:px-12 md:py-24 lg:col-span-5 lg:border-r lg:border-border"
        >
          <p className="orgni-kicker mb-10">Orgni</p>
          <h2 className="font-serif text-4xl leading-[1.02] md:text-6xl">
            Built for businesses in motion.
          </h2>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Orgni understands how your organisation works and helps keep
            knowledge, decisions, and routine work moving across teams and
            systems.
          </p>
          <Link
            href={ORGNI_PRODUCT_URL}
            className="mt-10 inline-flex min-h-14 items-center justify-between gap-8 bg-foreground px-6 font-mono text-xs font-bold uppercase text-background transition-colors hover:bg-primary"
          >
            Discover Orgni
            <ArrowUpRight className="h-5 w-5" />
          </Link>
        </motion.div>

        <ol className="grid border-t border-border sm:grid-cols-2 lg:col-span-7 lg:border-t-0">
          {valuePoints.map((point, i) => (
            <motion.li
              key={point}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
              className={`flex items-start gap-5 border-b border-border p-6 md:p-8 ${
                i % 2 === 0 ? "sm:border-r" : ""
              } ${i >= valuePoints.length - 2 ? "sm:border-b-0" : ""}`}
            >
              <span className="orgni-index mt-1 w-7 shrink-0">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-lg font-medium leading-snug md:text-xl">
                {point}
              </span>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
