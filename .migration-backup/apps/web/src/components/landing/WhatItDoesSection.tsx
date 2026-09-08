import { motion } from "framer-motion";

export function WhatItDoesSection() {
  const steps = [
    {
      title: "Model Structure",
      description:
        "Define the entities that matter: contracts, people, assets, and policies. Map their relationships.",
    },
    {
      title: "Stream Events",
      description:
        "Connect systems to feed the model. State changes and evidence updates become a timeline.",
    },
    {
      title: "Infer State",
      description:
        "Orgni calculates current reality. If a policy is violated, the model knows instantly.",
    },
    {
      title: "Expose Truth",
      description:
        "Teams and AI agents query Orgni to know exactly what is happening, with full evidence trails.",
    },
  ];

  return (
    <section
      id="platform"
      className="py-24 md:py-32 px-6 md:px-12 bg-background border-t border-border scroll-mt-20"
    >
      <div className="max-w-[1600px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 md:mb-24"
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight max-w-3xl">
            How Orgni constructs{" "}
            <span className="text-primary">operational reality.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative p-8 rounded-md bg-secondary/10 border border-border hover:bg-secondary/30 transition-colors"
            >
              <div className="text-6xl font-bold text-muted/60 mb-8 leading-none tracking-tighter">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground font-medium leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
