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
    <section className="bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:py-28 lg:grid-cols-[2fr_3fr] lg:gap-16">
        <motion.div initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}>
          <h2 className="font-serif text-3xl leading-tight tracking-tight md:text-5xl">
            Give Orgni work. Get the result.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
            Hand Orgni a task and it comes back done, with the context gathered
            from across the business.
          </p>
        </motion.div>

        <motion.div
          onViewportEnter={() => setActive(true)}
          onViewportLeave={() => setActive(false)}
          viewport={{ amount: 0.15 }}
          className="flex items-center"
        >
          <div className="w-full max-w-2xl rounded-2xl border border-border bg-background shadow-sm">

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
              <span className="text-sm text-muted-foreground">Status</span>
              <AnimatePresence mode="wait" initial={false}>
                {ready ? (
                  <motion.span
                    key="ready"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-lg font-medium text-primary"
                  >
                    Ready.
                  </motion.span>
                ) : (
                  <motion.span
                    key="working"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-sm text-muted-foreground"
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
