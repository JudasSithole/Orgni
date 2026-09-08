import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const stages = [
  {
    label: "Today",
    chain: ["Human", "Orgni", "Work"],
    note: "Someone asks. Orgni gathers the context and completes the work.",
    live: true,
  },
  {
    label: "Next",
    chain: ["Business event", "Orgni", "Work"],
    note: "A shipment slips, an invoice lands, a contract changes — and the routine follow-through begins without a prompt.",
    live: false,
  },
  {
    label: "Long-term",
    chain: ["Goals + constraints", "Continuous intelligent operation"],
    note: "The organisation sets the direction and the boundaries; routine operation keeps moving within them.",
    live: false,
  },
];

export function DirectionSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1600px] border-x border-border">
        <div className="grid lg:grid-cols-12">
          <div className="border-b border-border p-6 lg:col-span-3 lg:border-b-0 lg:border-r lg:p-8">
            <span className="orgni-index">OLX / 009 — DIRECTION</span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="px-6 py-16 md:px-12 md:py-24 lg:col-span-9"
          >
            <h2 className="max-w-4xl font-serif text-4xl leading-[1.02] md:text-6xl">
              From asking for work to work happening automatically.
            </h2>
            <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              As the infrastructure becomes more capable, routine work can
              increasingly happen without waiting for someone to initiate every
              step. This is the direction we are building towards, not a claim
              about today.
            </p>
          </motion.div>
        </div>

        <div className="grid gap-px border-t border-border bg-border lg:grid-cols-3">
          {stages.map((stage, i) => (
            <motion.div
              key={stage.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className="flex min-h-64 flex-col justify-between bg-background p-6 md:p-8"
            >
              <div className="flex items-center justify-between">
                <span className="orgni-index">{stage.label}</span>
                <span
                  className={`font-mono text-[11px] font-bold uppercase ${
                    stage.live ? "text-primary" : "text-muted-foreground/60"
                  }`}
                >
                  {stage.live ? "Available" : "Direction"}
                </span>
              </div>
              <div className="mt-10">
                <p className="flex flex-wrap items-center gap-x-3 gap-y-2 font-serif text-2xl md:text-3xl">
                  {stage.chain.map((item, j) => (
                    <span key={item} className="inline-flex items-center gap-3">
                      <span
                        className={
                          item === "Orgni" ? "text-primary" : undefined
                        }
                      >
                        {item}
                      </span>
                      {j < stage.chain.length - 1 && (
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      )}
                    </span>
                  ))}
                </p>
                <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                  {stage.note}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
