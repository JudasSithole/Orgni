import { useEffect, useRef, useState } from "react";
import { animate, motion, useInView, useReducedMotion } from "framer-motion";
import { Check, FileText, Target, UserRound } from "lucide-react";

const orgniMark = `${import.meta.env.BASE_URL}orgni-mark.png`;
const teamsLogo = `${import.meta.env.BASE_URL}integrations/teams.svg`;
const xeroLogo = `${import.meta.env.BASE_URL}integrations/xero.svg`;

const ease = [0.2, 0.8, 0.2, 1] as const;

type Stat = {
  value: number;
  prefix?: string;
  suffix?: string;
  label: string;
  compare?: string;
};

function CountUp({
  value,
  prefix = "",
  suffix = "",
  reduced,
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  reduced: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [n, setN] = useState(reduced ? value : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, reduced, value]);

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}
      {n}
      {suffix}
    </span>
  );
}

function StatBlock({ stat, reduced }: { stat: Stat; reduced: boolean }) {
  return (
    <div className="min-w-0">
      <p className="font-serif text-2xl leading-none tracking-tight md:text-3xl">
        <CountUp
          value={stat.value}
          prefix={stat.prefix}
          suffix={stat.suffix}
          reduced={reduced}
        />
      </p>
      <p className="mt-1.5 text-xs font-medium">{stat.label}</p>
      {stat.compare && (
        <p className="text-xs text-muted-foreground">{stat.compare}</p>
      )}
    </div>
  );
}

function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "orange" | "green";
}) {
  const cls =
    tone === "orange"
      ? "bg-primary/10 text-primary"
      : tone === "green"
        ? "bg-emerald-50 text-emerald-700"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${cls}`}
    >
      {children}
    </span>
  );
}

function Row({
  icon,
  title,
  meta,
  delay,
  reduced,
}: {
  icon: React.ReactNode;
  title: string;
  meta: string;
  delay: number;
  reduced: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: reduced ? 0 : 0.4, delay: reduced ? 0 : delay, ease }}
      className="flex min-w-0 items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5"
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-muted-foreground">
          {meta}
        </span>
      </span>
    </motion.div>
  );
}

function OrgniAvatar() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
      <img src={orgniMark} alt="" className="h-5 w-5 object-contain" />
    </span>
  );
}

/* Stage 1 — a person asks in Teams, Orgni delivers. */
function TodayVisual({ reduced }: { reduced: boolean }) {
  return (
    <div className="min-w-0 space-y-2.5">
      <Row
        reduced={reduced}
        delay={0.1}
        icon={
          <span className="relative shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#5b5fc7] text-[11px] font-semibold text-white">
              SM
            </span>
            <img
              src={teamsLogo}
              alt=""
              className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-white p-px"
            />
          </span>
        }
        title="@Orgni prepare the Halden brief"
        meta="Sarah · Microsoft Teams · 09:14"
      />
      <Row
        reduced={reduced}
        delay={0.45}
        icon={<OrgniAvatar />}
        title="Done. Brief shared with the account team."
        meta="Orgni · 09:16 · 1 attachment"
      />
    </div>
  );
}

/* Stage 2 — a business event fires, Orgni acts without being asked. */
function NextVisual({ reduced }: { reduced: boolean }) {
  return (
    <div className="min-w-0 space-y-2.5">
      <Row
        reduced={reduced}
        delay={0.1}
        icon={
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
            <img src={xeroLogo} alt="" className="h-4 w-4" />
          </span>
        }
        title="New invoice received"
        meta="Xero · INV-2048 · Meridian Freight"
      />
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ delay: reduced ? 0 : 0.4 }}
        className="flex items-center gap-2 pl-4 text-xs text-muted-foreground"
      >
        <span className="h-4 w-px bg-primary" />
        No one asked. Orgni noticed.
      </motion.div>
      <Row
        reduced={reduced}
        delay={0.6}
        icon={<OrgniAvatar />}
        title="Matched to PO, routed to Aisha for approval"
        meta="Orgni · automatic · 2 min after receipt"
      />
    </div>
  );
}

/* Stage 3 — a goal is set, routine work keeps moving inside its boundaries. */
function LongTermVisual({ reduced }: { reduced: boolean }) {
  const ticks = [
    "Delivery update sent to Brightline",
    "Supplier reminder scheduled",
    "Approval routed to Finance",
  ];
  return (
    <div className="min-w-0 space-y-2.5">
      <Row
        reduced={reduced}
        delay={0.1}
        icon={
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="h-4 w-4" />
          </span>
        }
        title="Goal: keep every delivery on time"
        meta="Set by you · within approval limits"
      />
      <div className="rounded-xl border border-border bg-background px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <OrgniAvatar />
            Running continuously
          </span>
          <span className="relative flex h-2 w-2">
            {!reduced && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            )}
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </div>
        <ul className="mt-2.5 space-y-1.5">
          {ticks.map((t, i) => (
            <motion.li
              key={t}
              initial={{ opacity: 0, x: -6 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: reduced ? 0 : 0.35, delay: reduced ? 0 : 0.5 + i * 0.25, ease }}
              className="flex items-center gap-2 text-xs text-foreground/80"
            >
              <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-600 text-white">
                <Check className="h-2 w-2" strokeWidth={3} />
              </span>
              {t}
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const stages = [
  {
    label: "Today",
    status: "Available now",
    live: true,
    title: "You ask, Orgni delivers.",
    involvement: "You start every task",
    Visual: TodayVisual,
    stats: [
      { value: 3, prefix: "~", suffix: " min", label: "per routine task", compare: "instead of ~45 min by hand" },
      { value: 200, label: "requests you still make", compare: "one per task, each week" },
    ] as Stat[],
  },
  {
    label: "Next",
    status: "In development",
    live: false,
    title: "The business triggers the work.",
    involvement: "You approve the exceptions",
    Visual: NextVisual,
    stats: [
      { value: 0, label: "requests needed", compare: "work starts from the event" },
      { value: 20, prefix: "~", label: "exceptions reach you", compare: "out of ~200 tasks a week" },
    ] as Stat[],
  },
  {
    label: "Long-term",
    status: "Direction",
    live: false,
    title: "You set the goal. Work keeps moving.",
    involvement: "You set direction and limits",
    Visual: LongTermVisual,
    stats: [
      { value: 24, suffix: "/7", label: "routine work in motion", compare: "inside the limits you set" },
      { value: 1, prefix: "~", suffix: " h", label: "of your week on routine", compare: "down from ~150 h across the team" },
    ] as Stat[],
  },
];

export function DirectionSection() {
  const reduced = useReducedMotion() ?? false;

  return (
    <section className="bg-muted/40">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl"
        >
          <h2 className="font-serif text-3xl leading-tight tracking-tight md:text-5xl">
            From asking for work to work happening automatically.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-muted-foreground">
            Each step hands more of the routine to Orgni, and keeps you in
            charge of what matters.
          </p>
        </motion.div>

        {/* Progress track */}
        <div className="relative mt-14 hidden lg:block" aria-hidden>
          <div className="absolute inset-x-0 top-1/2 h-px bg-border" />
          <motion.div
            className="absolute left-0 top-1/2 h-px bg-primary"
            style={{ originX: 0 }}
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: true }}
            transition={{ duration: reduced ? 0 : 1.6, ease }}
          />
          <div className="relative grid grid-cols-3">
            {stages.map((stage, i) => (
              <div key={stage.label} className="flex items-center gap-3">
                <motion.span
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: reduced ? 0 : 0.2 + i * 0.6, duration: 0.3 }}
                  className={`h-3 w-3 rounded-full border-2 ${
                    stage.live
                      ? "border-primary bg-primary"
                      : "border-primary bg-background"
                  }`}
                />
                <span className="bg-muted/40 pr-3 text-sm font-medium">
                  {stage.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {stages.map((stage, i) => (
            <motion.div
              key={stage.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 * i }}
              className={`flex min-w-0 flex-col rounded-2xl border bg-background p-5 md:p-6 ${
                stage.live ? "border-primary/40 shadow-sm" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {stage.label}
                </span>
                <Pill tone={stage.live ? "orange" : "neutral"}>{stage.status}</Pill>
              </div>
              <p className="mt-2 text-lg font-medium leading-snug">{stage.title}</p>

              <div className="mb-5 mt-5 min-w-0 flex-1 rounded-xl bg-muted/50 p-3">
                <stage.Visual reduced={reduced} />
              </div>

              <div className="mt-auto grid grid-cols-2 gap-4 border-t border-border pt-5 ">
                {stage.stats.map((stat) => (
                  <StatBlock key={stat.label} stat={stat} reduced={reduced} />
                ))}
              </div>

              <div className="flex items-center gap-2 pt-5 text-sm text-muted-foreground">
                <UserRound className="h-4 w-4" />
                {stage.involvement}
              </div>
            </motion.div>
          ))}
        </div>

        <p className="mt-8 text-sm text-muted-foreground">
          <FileText className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
          Figures are an illustrative example for a team handling ~200 routine
          tasks a week, not measured results. Today is live; Next and
          long-term describe where Orgni is heading.
        </p>
      </div>
    </section>
  );
}
