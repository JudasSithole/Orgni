import { motion } from "framer-motion";

const evidenceFlowImage = "/evidence-flow.png";

export function InfrastructureSection() {
  return (
    <section
      id="infrastructure"
      className="scroll-mt-20 border-b border-border"
    >
      <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="border-b border-border p-6 md:p-10 lg:col-span-4 lg:border-b-0 lg:border-r lg:p-12"
        >
          <span className="orgni-index mb-16 block">ORG / 003</span>
          <p className="orgni-kicker mb-8">How Orgni resolves it</p>
          <h2 className="font-serif text-4xl leading-[1.02] md:text-6xl">
            From scattered evidence to dependable context.
          </h2>
          <p className="mt-8 text-lg leading-relaxed text-muted-foreground">
            Orgni ingests evidence and activity, links what belongs together,
            and maintains structured context with provenance attached.
          </p>
        </motion.div>

        <motion.figure
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="flex min-h-[520px] flex-col justify-center bg-white p-4 md:p-8 lg:col-span-8 lg:p-10"
        >
          <img
            src={evidenceFlowImage}
            alt="Conceptual architecture showing source systems feeding Orgni infrastructure and downstream consumers."
            className="h-auto w-full"
            width={1535}
            height={1024}
            loading="lazy"
          />
          <figcaption className="border-t border-black/15 px-2 pt-4 font-mono text-[10px] uppercase text-black/55">
            Target architecture / connectors shown conceptually, not as active
            integrations
          </figcaption>
        </motion.figure>
      </div>
    </section>
  );
}
