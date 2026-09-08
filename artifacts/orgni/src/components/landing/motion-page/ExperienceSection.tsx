import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

const COMMAND = "@Orgni prepare everything for tomorrow’s client meeting.";

const steps = [
  "Gathered recent emails",
  "Found the latest proposal",
  "Retrieved account history",
  "Identified unresolved issues",
  "Prepared the meeting brief",
  "Checked relevant calendars",
];

const TYPE_MS = 32;
const STEP_MS = 650;
const HOLD_MS = 4200;

export function ExperienceSection() {
  const reduced = useReducedMotion() ?? false;
  const [typed, setTyped] = useState(reduced ? COMMAND.length : 0);
  const [done, setDone] = useState(reduced ? steps.length : 0);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!active || reduced) return;

    let cancelled = false;
    const timers: number[] = [];

    const run = () => {
      setTyped(0);
      setDone(0);
      for (let i = 1; i <= COMMAND.length; i += 1) {
        timers.push(window.setTimeout(() => !cancelled && setTyped(i), i * TYPE_MS));
      }
      const typingDone = COMMAND.length * TYPE_MS + 500;
      for (let s = 1; s <= steps.length; s += 1) {
        timers.push(
          window.setTimeout(
            () => !cancelled && setDone(s),
            typingDone + s * STEP_MS,
          ),
        );
      }
      timers.push(
        window.setTimeout(run, typingDone + steps.length * STEP_MS + HOLD_MS),
      );
    };

    run();
    return () => {
      cancelled = true;
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [active, reduced]);

  const ready = done === steps.length;

  return (
    <section className="border-b border-border bg-muted/40">
      <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
        <div className="px-6 py-16 md:px-12 md:py-24 lg:col-span-4 lg:border-r lg:border-border">
          <p className="orgni-kicker mb-10">The experience</p>
          <h2 className="font-serif text-4xl leading-[1.02] md:text-5xl">
            Give Orgni work. Get the result.
          </h2>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            Orgni does not only answer questions. Hand it a piece of work and
            it comes back completed, with the context gathered from across the
            business.
          </p>
        </div>

        <motion.div
          onViewportEnter={() => setActive(true)}
          onViewportLeave={() => setActive(false)}
          viewport={{ amount: 0.15 }}
          className="flex items-center px-6 py-12 md:px-12 md:py-20 lg:col-span-8"
        >
          <div className="w-full max-w-2xl border border-border bg-background shadow-sm">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="orgni-index">Request</span>
              <span className="orgni-index">Orgni</span>
            </div>

            <div className="border-b border-border px-5 py-6 md:px-7">
              <p className="min-h-[2.6em] text-lg font-medium leading-snug md:text-2xl">
                <span className="text-primary">{COMMAND.slice(0, 6)}</span>
                {COMMAND.slice(6, typed)}
                {!reduced && typed < COMMAND.length && (
                  <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-foreground" />
                )}
              </p>
            </div>

            <ol className="px-5 py-4 md:px-7">
              {steps.map((step, i) => {
                const complete = i < done;
                const current = i === done && typed === COMMAND.length && !ready;
                return (
                  <li
                    key={step}
                    className="flex items-center gap-4 border-b border-border/60 py-3 last:border-b-0"
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center border transition-colors duration-300 ${
                        complete
                          ? "border-foreground bg-foreground text-background"
                          : current
                            ? "border-primary"
                            : "border-border"
                      }`}
                    >
                      {complete && <Check className="h-3 w-3" strokeWidth={3} />}
                      {current && (
                        <span className="h-1.5 w-1.5 animate-pulse bg-primary" />
                      )}
                    </span>
                    <span
                      className={`text-base transition-colors duration-300 md:text-lg ${
                        complete ? "text-foreground" : "text-muted-foreground/60"
                      }`}
                    >
                      {step}
                    </span>
                  </li>
                );
              })}
            </ol>

            <div className="flex min-h-16 items-center justify-between border-t border-border px-5 md:px-7">
              <span className="orgni-index">Status</span>
              <AnimatePresence mode="wait" initial={false}>
                {ready ? (
                  <motion.span
                    key="ready"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="font-serif text-2xl text-primary"
                  >
                    Ready.
                  </motion.span>
                ) : (
                  <motion.span
                    key="working"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="font-mono text-xs font-bold uppercase text-muted-foreground"
                  >
                    {typed < COMMAND.length ? "Listening" : "Working"}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
