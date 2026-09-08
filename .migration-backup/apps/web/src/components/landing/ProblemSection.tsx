import { motion } from "framer-motion";
import { User, HelpCircle } from "lucide-react";
import { SiGmail, SiGooglesheets, SiJira, SiSap } from "react-icons/si";

const answers = [
  {
    icon: SiGmail,
    iconColor: "#EA4335",
    tool: "Gmail",
    quote: "\u201CWe agreed Net 60 with them last quarter.\u201D",
    meta: "Email thread, 4 months ago",
  },
  {
    icon: SiGooglesheets,
    iconColor: "#34A853",
    tool: "Google Sheets",
    quote: "\u201CVendor tracker says Net 30.\u201D",
    meta: "Last edited by someone who left",
  },
  {
    icon: SiJira,
    iconColor: "#0052CC",
    tool: "Jira",
    quote: "\u201CTicket says renegotiation still pending.\u201D",
    meta: "Status: unresolved",
  },
  {
    icon: SiSap,
    iconColor: "#008FD3",
    tool: "SAP",
    quote: "\u201CSystem still shows the old contract terms.\u201D",
    meta: "Never updated",
  },
];

const costs = [
  {
    stat: "4 tools",
    label: "One answer, scattered across four different systems.",
  },
  {
    stat: "0 sources",
    label: "Nobody can say where the \u201Ctruth\u201D actually came from.",
  },
  {
    stat: "Hours lost",
    label: "Every new person rebuilds the same context from scratch.",
  },
  {
    stat: "Weak decisions",
    label:
      "People and systems act without a shared, traceable operational context.",
  },
];

export function ProblemSection() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="relative mx-auto max-w-[1600px] border-x border-border px-6 py-20 md:px-12 md:py-28">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-16 max-w-4xl md:mb-20"
        >
          <p className="orgni-kicker mb-8">The problem / 002</p>
          <h2 className="mb-6 font-serif text-4xl leading-[1.02] text-foreground md:text-6xl xl:text-7xl">
            Your organisation has data.
            <br />
            <span className="text-primary">It lacks shared understanding.</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed font-medium">
            One operational decision can depend on evidence scattered across
            many systems.
          </p>
        </motion.div>

        {/* The question */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-10 flex items-start gap-3 md:mb-12"
        >
          <div className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center shrink-0 shadow-sm">
            <User className="text-muted-foreground" size={18} />
          </div>
          <div className="max-w-md border-l-4 border-primary bg-foreground px-5 py-3.5 text-base font-semibold text-background md:text-lg">
            What are our payment terms with Acme Corp?
          </div>
        </motion.div>

        {/* Four conflicting answers */}
        <div className="mb-10 grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 md:mb-12 lg:grid-cols-4">
          {answers.map((a, i) => (
            <motion.div
              key={a.tool}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.2 + i * 0.12 }}
              className="bg-card p-5 transition-colors hover:bg-muted"
            >
              <div className="flex items-center gap-2.5 mb-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-secondary">
                  <a.icon size={16} style={{ color: a.iconColor }} />
                </div>
                <span className="text-sm font-semibold text-muted-foreground">
                  {a.tool}
                </span>
              </div>
              <p className="text-[15px] leading-snug font-medium text-foreground mb-3">
                {a.quote}
              </p>
              <p className="text-xs text-muted-foreground/70 font-medium">
                {a.meta}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Punchline */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mb-16 flex items-center md:mb-20"
        >
          <div className="flex items-center gap-3 bg-primary px-6 py-4 text-primary-foreground">
            <HelpCircle className="shrink-0" size={18} />
            <span className="text-sm font-semibold md:text-base">
              One question. Four different answers. Nobody knows which is true.
            </span>
          </div>
        </motion.div>

        {/* What it costs you */}
        <div className="grid grid-cols-1 gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {costs.map((c, i) => (
            <motion.div
              key={c.stat}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 + i * 0.1 }}
              className="bg-card p-6 md:p-8"
            >
              <div className="mb-3 font-serif text-3xl text-foreground md:text-4xl">
                {c.stat}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                {c.label}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
