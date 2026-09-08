import { motion } from "framer-motion";

const foundations = [
  "Organisational context",
  "Operational intelligence",
  "Memory",
  "Authority",
  "Business state",
  "Execution",
  "Intelligent systems",
];

export function InfrastructureStorySection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="px-6 py-16 md:px-12 md:py-24 lg:col-span-7 lg:border-r lg:border-border"
        >
          <p className="orgni-kicker mb-10">Olyxee</p>
          <h2 className="font-serif text-4xl leading-[1.02] md:text-6xl">
            We are building beyond the interface.
          </h2>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            AI models, agents, voice systems, and business software will
            continue to change. Olyxee is focused on the infrastructure
            underneath them.
          </p>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed md:text-xl">
            Orgni is the first product on that foundation. The foundation
            itself is what we are building.
          </p>
          <p className="mt-12 inline-block border-l-2 border-primary pl-5 font-mono text-xs font-bold uppercase leading-relaxed text-muted-foreground">
            Research and infrastructure
            <br />
            for operational intelligence.
          </p>
        </motion.div>

        <div className="border-t border-border lg:col-span-5 lg:border-t-0">
          <div className="border-b border-border p-6 md:px-10">
            <span className="orgni-index">Built around</span>
          </div>
          <ul>
            {foundations.map((item, i) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, x: 8 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.05 * i }}
                className="flex items-baseline justify-between gap-6 border-b border-border px-6 py-5 last:border-b-0 md:px-10"
              >
                <span className="font-serif text-2xl md:text-3xl">{item}</span>
                <span className="orgni-index">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
