import { motion } from "framer-motion";

const integrations = [
  { name: "SAP", file: "sap.svg" },
  { name: "Salesforce", file: "salesforce.svg" },
  { name: "Slack", file: "slack.svg" },
  { name: "Gmail", file: "gmail.svg" },
  { name: "Google Drive", file: "googledrive.svg" },
  { name: "Google Sheets", file: "googlesheets.svg" },
  { name: "Notion", file: "notion.svg" },
  { name: "Jira", file: "jira.svg" },
  { name: "Asana", file: "asana.svg" },
  { name: "HubSpot", file: "hubspot.svg" },
  { name: "QuickBooks", file: "quickbooks.svg" },
  { name: "Xero", file: "xero.svg" },
  { name: "Stripe", file: "stripe.svg" },
  { name: "Dropbox", file: "dropbox.svg" },
  { name: "GitHub", file: "github.svg" },
  { name: "Zapier", file: "zapier.svg" },
];

const networkPositions = [
  [100, 100],
  [300, 65],
  [500, 55],
  [700, 65],
  [900, 100],
  [940, 270],
  [900, 470],
  [700, 535],
  [500, 545],
  [300, 535],
  [100, 470],
  [60, 270],
  [220, 245],
  [780, 245],
  [220, 395],
  [780, 395],
] as const;

export function IntegrationsSection() {
  return (
    <section className="overflow-hidden border-b border-border bg-background">
      <div className="mx-auto max-w-[1600px] border-x border-border px-6 py-20 md:px-12 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-14 flex max-w-4xl flex-col items-start gap-6"
        >
          <span className="orgni-index">ORG / 004</span>
          <p className="orgni-kicker">Source architecture</p>
          <h2 className="font-serif text-4xl leading-[1.02] text-foreground md:text-6xl">
            Designed to unify evidence across your organisation.
          </h2>
          <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground">
            Conversations, documents, email, APIs, business systems and
            databases can contribute to one operational model. The systems below
            illustrate the target connector network; they are not all active
            integrations today.
          </p>
        </motion.div>

        <div className="relative hidden h-[680px] overflow-hidden border-y border-border md:block">
          <div
            className="absolute inset-0 opacity-40"
            aria-hidden="true"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--border) / 0.45) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.45) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1000 600"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {networkPositions.map(([x, y], index) => (
              <motion.line
                key={`spoke-${integrations[index].name}`}
                x1="500"
                y1="300"
                x2={x}
                y2={y}
                stroke="hsl(var(--primary))"
                strokeOpacity="0.34"
                strokeWidth="1.5"
                strokeDasharray="5 7"
                initial={{ pathLength: 0, opacity: 0 }}
                whileInView={{ pathLength: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.035, duration: 0.7 }}
              />
            ))}
            <motion.polyline
              points={`${networkPositions.map(([x, y]) => `${x},${y}`).join(" ")} ${networkPositions[0][0]},${networkPositions[0][1]}`}
              fill="none"
              stroke="hsl(var(--foreground))"
              strokeOpacity="0.12"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4 }}
            />
          </svg>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="absolute left-1/2 top-1/2 z-20 flex h-32 w-32 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-2 rounded-full border border-primary/40 bg-background shadow-xl"
          >
            <span className="absolute inset-2 rounded-full border border-primary/15" />
            <img
              src={`${import.meta.env.BASE_URL}orgni-logo.png`}
              alt=""
              className="relative h-9 w-9 object-cover"
            />
            <span className="relative font-serif text-xl font-bold text-foreground">
              Orgni
            </span>
            <span className="relative text-[9px] font-mono uppercase text-primary">
              Context engine
            </span>
          </motion.div>

          {integrations.map((tool, index) => {
            const [x, y] = networkPositions[index];
            return (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, scale: 0.85 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.035, duration: 0.35 }}
                className="group absolute z-10 flex w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 rounded-md border border-border bg-background/95 px-3 py-3 shadow-sm backdrop-blur-sm transition-all duration-300 hover:z-30 hover:border-primary/50 hover:shadow-md"
                style={{ left: `${x / 10}%`, top: `${y / 6}%` }}
                title={tool.name}
              >
                <img
                  src={`${import.meta.env.BASE_URL}integrations/${tool.file}`}
                  alt=""
                  className="h-7 w-7 object-contain"
                  loading="lazy"
                />
                <span className="w-full truncate text-center text-[9px] font-mono font-bold uppercase text-muted-foreground group-hover:text-foreground">
                  {tool.name}
                </span>
              </motion.div>
            );
          })}
        </div>

        <div className="relative md:hidden">
          <div className="mx-auto flex w-fit items-center gap-3 rounded-md border border-primary/30 bg-background px-5 py-3 shadow-sm">
            <img
              src={`${import.meta.env.BASE_URL}orgni-logo.png`}
              alt=""
              className="h-7 w-7 object-cover"
            />
            <span className="font-serif text-lg font-bold text-foreground">
              Orgni
            </span>
          </div>
          <div className="mx-auto h-8 w-px bg-primary/40" />
          <div className="mb-4 h-px bg-primary/30" />
          <div className="grid grid-cols-2 gap-3">
            {integrations.map((tool, index) => (
              <motion.div
                key={tool.name}
                initial={{ opacity: 0, y: 8 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.025 }}
                className="relative flex min-h-16 items-center gap-3 rounded-md border border-border bg-background px-3 py-3"
              >
                <span className="absolute -top-4 left-1/2 h-4 w-px bg-primary/25" />
                <img
                  src={`${import.meta.env.BASE_URL}integrations/${tool.file}`}
                  alt=""
                  className="h-7 w-7 shrink-0 object-contain"
                  loading="lazy"
                />
                <span className="text-[10px] font-mono font-bold uppercase leading-tight text-muted-foreground">
                  {tool.name}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
