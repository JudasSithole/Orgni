import { motion } from "framer-motion";

const areas = [
  {
    name: "Logistics",
    text: "Track shipments, handle exceptions, coordinate updates, and retrieve operational context.",
  },
  {
    name: "Finance",
    text: "Retrieve invoices, answer financial questions, follow up on payments, and route approvals.",
  },
  {
    name: "Sales",
    text: "Prepare account context, surface open issues, coordinate follow-ups, and support meetings.",
  },
  {
    name: "Operations",
    text: "Identify blockers, dependencies, owners, deadlines, and unresolved work.",
  },
  {
    name: "Customer Service",
    text: "Understand customer requests, retrieve context, handle routine work, and escalate exceptions.",
  },
  {
    name: "HR",
    text: "Support onboarding, policies, internal requests, scheduling, and authorised employee information.",
  },
];

export function UseCasesSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-[1600px] border-x border-border">
        <div className="grid lg:grid-cols-12">
          <div className="border-b border-border p-6 lg:col-span-3 lg:border-b-0 lg:border-r lg:p-8">
            <span className="orgni-index">OLX / 006 — ACROSS THE BUSINESS</span>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="px-6 py-16 md:px-12 md:py-24 lg:col-span-9"
          >
            <h2 className="max-w-4xl font-serif text-4xl leading-[1.02] md:text-6xl">
              One operational layer. Across the business.
            </h2>
          </motion.div>
        </div>

        <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area, i) => (
            <motion.div
              key={area.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.06 * i }}
              className="flex min-h-56 flex-col justify-between bg-background p-6 md:p-8"
            >
              <span className="orgni-index">{String(i + 1).padStart(2, "0")}</span>
              <div className="mt-10">
                <h3 className="font-serif text-2xl md:text-3xl">{area.name}</h3>
                <p className="mt-3 text-base leading-relaxed text-muted-foreground">
                  {area.text}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
