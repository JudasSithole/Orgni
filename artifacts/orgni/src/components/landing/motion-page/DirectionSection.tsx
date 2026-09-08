import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const stages = [
  {
    label: "Today",
    chain: ["You ask", "Orgni", "Work done"],
    note: "Someone asks. Orgni gathers the context and completes the work.",
    live: true,
  },
  {
    label: "Next",
    chain: ["Business event", "Orgni", "Work done"],
    note: "Something changes in the business and the routine follow-through starts on its own.",
    live: false,
  },
  {
    label: "Long-term",
    chain: ["Goals set", "Continuous operation"],
    note: "You set the direction and the boundaries. Routine work keeps moving within them.",
    live: false,
  },
];

export function DirectionSection() {
  return (
    <section className="bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <motion.div initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }} className="max-w-2xl">
          <h2 className="font-serif text-3xl leading-tight tracking-tight md:text-5xl">
            From asking for work to work happening automatically.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            This is where we are heading, not a claim about today.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 lg:grid-cols-3">
          {stages.map((stage, i) => (
            <motion.div
              key={stage.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className="rounded-2xl border border-border bg-background p-6 md:p-7"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{stage.label}</span>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    stage.live
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {stage.live ? "Available now" : "Coming"}
                </span>
              </div>
              <p className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-lg font-medium">
                {stage.chain.map((item, j) => (
                  <span key={item} className="inline-flex items-center gap-2">
                    <span className={item === "Orgni" ? "text-primary" : undefined}>
                      {item}
                    </span>
                    {j < stage.chain.length - 1 && (
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </span>
                ))}
              </p>
              <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                {stage.note}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
