import { motion } from "framer-motion";
import {
  FileText,
  Receipt,
  CreditCard,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  SearchCheck,
} from "lucide-react";

export function UseCaseSection() {
  const outputs = [
    {
      icon: CheckCircle2,
      text: "Every active contract and what it obliges you to do",
    },
    {
      icon: AlertTriangle,
      text: "Invoices that have no agreement behind them",
    },
    {
      icon: Link2,
      text: "Payments that don't match any invoice",
    },
    {
      icon: Clock,
      text: "Approvals that are still waiting on someone",
    },
    {
      icon: SearchCheck,
      text: "Conflicting or missing paperwork, flagged for review",
    },
  ];

  const chain = [
    {
      icon: FileText,
      label: "Contract",
      name: "CT-112 · Acme Logistics",
      detail: "Net 60 · Signed 12 Mar",
      status: "ACTIVE",
      statusColor: "bg-green-100 text-green-800 border-green-200",
      linked: true,
    },
    {
      icon: Receipt,
      label: "Invoice",
      name: "INV-2391 · R18,450.00",
      detail: "Issued 12 Jul · Matches PO-8842",
      status: "MATCHED",
      statusColor: "bg-green-100 text-green-800 border-green-200",
      linked: true,
    },
    {
      icon: CreditCard,
      label: "Payment",
      name: "No payment recorded",
      detail: "Due in 18 days under Net 60 terms",
      status: "OUTSTANDING",
      statusColor: "bg-amber-100 text-amber-800 border-amber-200",
      linked: false,
    },
  ];

  return (
    <section
      id="use-cases"
      className="py-24 md:py-32 px-6 md:px-12 bg-secondary/30 border-t border-border scroll-mt-20"
    >
      <div className="max-w-[1600px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-5 lg:col-start-1"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-wide uppercase mb-6">
              Where teams start
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-[1.1] tracking-tight">
              Start with contracts, invoices &amp; payments.
            </h2>

            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium mb-10">
              Orgni links every contract to its invoices, payments and
              approvals, so the money trail reads as one story.
            </p>

            <div className="bg-background p-6 md:p-8 rounded-xl border border-border shadow-sm">
              <h4 className="text-xs font-bold tracking-widest text-primary uppercase mb-6">
                What you see on day one
              </h4>
              <ul className="space-y-4">
                {outputs.map((output, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.07, duration: 0.35 }}
                    className="flex items-start gap-4"
                  >
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                      <output.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-base font-semibold text-foreground leading-snug pt-1">
                      {output.text}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-6 lg:col-start-7"
          >
            <div className="bg-background rounded-xl border border-border shadow-xl overflow-hidden">
              <div className="bg-secondary/50 px-6 py-5 border-b border-border flex justify-between items-center">
                <span className="font-bold text-lg text-foreground tracking-tight">
                  One money trail, connected
                </span>
                <span className="flex items-center gap-2 font-mono text-xs text-primary font-bold uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                  Live
                </span>
              </div>

              <div className="p-6 md:p-8">
                {chain.map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.25 + i * 0.15, duration: 0.4 }}
                  >
                    <div className="flex items-center gap-4 p-4 rounded-lg border border-border bg-secondary/20 hover:border-primary/40 transition-colors">
                      <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-0.5">
                          {item.label}
                        </div>
                        <div className="font-semibold text-foreground text-sm md:text-base truncate">
                          {item.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {item.detail}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 text-[11px] font-mono font-bold rounded-sm border shrink-0 ${item.statusColor}`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {i < chain.length - 1 && (
                      <div className="flex items-center gap-2 py-1.5 pl-9">
                        <div className="w-px h-5 bg-primary/30"></div>
                        <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-primary/70 uppercase tracking-wider">
                          <Link2 className="h-3 w-3" />
                          linked by Orgni
                        </span>
                      </div>
                    )}
                  </motion.div>
                ))}

                {/* Grounded answer produced from the trail */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.8, duration: 0.4 }}
                  className="mt-6 p-4 md:p-5 rounded-lg bg-primary/5 border border-primary/20"
                >
                  <div className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary mb-2">
                    So when someone asks
                  </div>
                  <p className="text-sm md:text-base font-semibold text-foreground leading-snug">
                    “What do we owe Acme Logistics?” →{" "}
                    <span className="text-primary">
                      R18,450.00, due in 18 days
                    </span>
                    , with the contract, invoice and approval attached.
                  </p>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
