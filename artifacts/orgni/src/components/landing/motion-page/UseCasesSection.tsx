import { motion } from "framer-motion";

const areas = [
  { name: "Logistics", text: "Track shipments, handle exceptions, and keep everyone updated." },
  { name: "Finance", text: "Find invoices, follow up on payments, and route approvals." },
  { name: "Sales", text: "Prepare account context and coordinate follow-ups." },
  { name: "Operations", text: "See blockers, owners, deadlines, and unresolved work." },
  { name: "Customer Service", text: "Handle routine requests and escalate exceptions." },
  { name: "HR", text: "Support onboarding, policies, and internal requests." },
];

export function UseCasesSection() {
  return (
    <section>
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl font-serif text-3xl leading-tight tracking-tight md:text-5xl"
        >
          One operational layer. Across the business.
        </motion.h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area, i) => (
            <motion.div
              key={area.name}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.06 * i }}
              className="rounded-2xl bg-muted/50 p-6 md:p-7"
            >
              <h3 className="text-xl font-medium">{area.name}</h3>
              <p className="mt-2 text-base leading-relaxed text-muted-foreground">
                {area.text}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
