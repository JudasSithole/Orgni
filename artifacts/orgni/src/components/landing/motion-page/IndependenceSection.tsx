import { motion } from "framer-motion";

const interfaces = [
  "Teams",
  "Voice",
  "Email",
  "Chat",
  "API",
  "Internal apps",
  "Other agents",
];

const core = [
  "Business context",
  "Memory",
  "Identity",
  "Permissions",
  "Policies",
  "Operational state",
];

function Layer({
  label,
  items,
  tone,
  delay,
}: {
  label: string;
  items: string[];
  tone: "light" | "dark" | "muted";
  delay: number;
}) {
  const shell =
    tone === "dark"
      ? "bg-foreground text-background border-foreground"
      : tone === "muted"
        ? "bg-muted/60 text-muted-foreground border-border"
        : "bg-background text-foreground border-border";
  const chip =
    tone === "dark"
      ? "border-white/25 text-white/85"
      : "border-border text-foreground/85";

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay }}
      className={`rounded-2xl border ${shell}`}
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-2 md:px-6">
        <span
          className={`text-sm font-medium ${tone === "dark" ? "text-white/60" : "text-muted-foreground"}`}
        >
          {label}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 px-5 pb-5 md:px-6">
        {items.map((item) => (
          <span
            key={item}
            className={`rounded-full border px-3 py-1 text-sm ${chip}`}
          >
            {item}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function Connector({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ scaleY: 0 }}
      whileInView={{ scaleY: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay }}
      style={{ originY: 0 }}
      className="mx-auto h-8 w-px bg-primary"
      aria-hidden
    />
  );
}

export function IndependenceSection() {
  return (
    <section>
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
        <motion.div initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}>
          <h2 className="font-serif text-3xl leading-tight tracking-tight md:text-5xl">
            Not tied to one interface. Not tied to one model.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
            People reach Orgni from wherever work already happens. As models
            and tools change, your business context and permissions stay in
            place.
          </p>
        </motion.div>

        <div className="mx-auto w-full max-w-xl">
          <Layer label="Interfaces" items={interfaces} tone="light" delay={0} />
          <Connector delay={0.25} />
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.35 }}
            className="flex items-center justify-between rounded-2xl bg-primary px-5 py-5 text-primary-foreground md:px-6"
          >
            <span className="text-2xl font-medium">Orgni</span>
            <span className="text-sm text-primary-foreground/80">Operational layer</span>
          </motion.div>
          <Connector delay={0.5} />
          <Layer label="Held by Orgni" items={core} tone="dark" delay={0.6} />
          <Connector delay={0.8} />
          <Layer
            label="Capabilities"
            items={["Models", "Tools", "Systems"]}
            tone="muted"
            delay={0.9}
          />
        </div>
      </div>
    </section>
  );
}
