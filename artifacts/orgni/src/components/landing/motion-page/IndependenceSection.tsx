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
      className={`border ${shell}`}
    >
      <div className="flex items-center justify-between px-5 py-3 md:px-7">
        <span
          className={`orgni-index ${tone === "dark" ? "!text-white/55" : ""}`}
        >
          {label}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 px-5 pb-5 md:px-7 md:pb-6">
        {items.map((item) => (
          <span
            key={item}
            className={`border px-3 py-1.5 font-mono text-[11px] font-bold uppercase ${chip}`}
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
    <section className="border-b border-border bg-muted/40">
      <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="px-6 py-16 md:px-12 md:py-24 lg:col-span-5 lg:border-r lg:border-border"
        >
          <p className="orgni-kicker mb-10">Independence</p>
          <h2 className="font-serif text-4xl leading-[1.02] md:text-5xl">
            Not tied to one interface. Not tied to one model.
          </h2>
          <div className="mt-8 space-y-6 text-lg leading-relaxed text-muted-foreground">
            <p>
              <span className="text-foreground">Teams is an interface,</span>{" "}
              not the product. People reach Orgni from wherever work already
              happens.
            </p>
            <p>
              <span className="text-foreground">
                AI models are capabilities Orgni can use,
              </span>{" "}
              not Orgni itself. As models and tools change, the business
              context, memory, and permissions underneath stay in place.
            </p>
          </div>
        </motion.div>

        <div className="px-6 py-12 md:px-12 md:py-20 lg:col-span-7">
          <div className="mx-auto max-w-2xl">
            <Layer label="Interfaces" items={interfaces} tone="light" delay={0} />
            <Connector delay={0.25} />
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.35 }}
              className="flex items-center justify-between border border-primary bg-primary px-5 py-5 text-primary-foreground md:px-7"
            >
              <span className="font-serif text-3xl md:text-4xl">Orgni</span>
              <span className="orgni-index !text-primary-foreground/70">
                Operational layer
              </span>
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
      </div>
    </section>
  );
}
