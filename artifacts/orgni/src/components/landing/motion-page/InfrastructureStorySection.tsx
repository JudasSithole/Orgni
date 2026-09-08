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
    <section className="bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
        <motion.div initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}>
          <p className="text-sm font-medium text-primary">Olyxee</p>
          <h2 className="mt-3 font-serif text-3xl leading-tight tracking-tight md:text-5xl">
            We are building beyond the interface.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
            Models, agents, and business software will keep changing. Olyxee
            builds the infrastructure underneath them. Orgni is the first
            product on that foundation.
          </p>
        </motion.div>

        <div className="self-center">
          <p className="text-sm font-medium text-muted-foreground">Built around</p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {foundations.map((item, i) => (
              <motion.li
                key={item}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: 0.05 * i }}
                className="rounded-full border border-border bg-background px-4 py-2 text-base"
              >
                {item}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
