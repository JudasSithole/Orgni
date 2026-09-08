import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  Calendar,
  Check,
  FileText,
  MessageSquare,
  Send,
  Users,
} from "lucide-react";

const TEAMS_LOGO = `${import.meta.env.BASE_URL}integrations/teams.svg`;

const members = [
  { initials: "SM", color: "bg-[#5b5fc7]" },
  { initials: "DN", color: "bg-[#c239b3]" },
  { initials: "TK", color: "bg-[#0f7b6c]" },
  { initials: "AP", color: "bg-[#ca5010]" },
];

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
const HOLD_MS = 9000;

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
          className="flex min-w-0 items-center"
        >
          <div
            className="w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-white shadow-lg"
            aria-label="Example conversation with Orgni inside Microsoft Teams"
          >
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-[#e1dfdd] bg-[#f5f5f5] px-4 py-2.5">
              <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
              <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
              <span className="h-3 w-3 rounded-full bg-[#28c840]" />
              <span className="ml-3 flex items-center gap-2 text-xs font-medium text-[#616161]">
                <img src={TEAMS_LOGO} alt="" className="h-4 w-4" />
                Microsoft Teams
              </span>
            </div>

            <div className="flex">
              {/* Left rail */}
              <div className="hidden w-16 shrink-0 flex-col items-center gap-5 border-r border-[#e1dfdd] bg-[#ebebeb] py-4 sm:flex">
                <img src={TEAMS_LOGO} alt="Microsoft Teams" className="mb-1 h-7 w-7" />
                {[
                  { label: "Activity", icon: Bell },
                  { label: "Chat", icon: MessageSquare, active: true },
                  { label: "Teams", icon: Users },
                  { label: "Calendar", icon: Calendar },
                ].map(({ label, icon: Icon, active: on }) => (
                  <div
                    key={label}
                    className={`flex flex-col items-center gap-1 text-[10px] ${
                      on ? "text-[#5b5fc7]" : "text-[#616161]"
                    }`}
                  >
                    <Icon className="h-5 w-5" strokeWidth={on ? 2.2 : 1.8} />
                    {label}
                  </div>
                ))}
              </div>

              {/* Conversation */}
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-3 border-b border-[#e1dfdd] px-4 py-3">
                  <div className="flex -space-x-2">
                    {members.slice(0, 3).map((m) => (
                      <span
                        key={m.initials}
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold text-white ${m.color}`}
                      >
                        {m.initials}
                      </span>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#242424]">
                      Halden Logistics – Account team
                    </p>
                    <p className="text-xs text-[#616161]">
                      {members.length} members · Orgni added
                    </p>
                  </div>
                  <Users className="hidden h-4 w-4 text-[#616161] sm:block" />
                </div>

                <div className="flex h-[640px] flex-col sm:h-[580px] gap-4 overflow-hidden bg-[#f5f5f5] px-4 py-5 md:px-6">
                  {/* Earlier group message */}
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#c239b3] text-xs font-semibold text-white">
                      DN
                    </span>
                    <div className="min-w-0">
                      <p className="mb-1 text-xs text-[#616161]">
                        David Naidoo <span className="ml-2">09:12</span>
                      </p>
                      <div className="rounded-lg rounded-tl-none bg-white px-4 py-2.5 text-[15px] leading-snug text-[#242424]">
                        Halden moved the meeting to tomorrow 10:00. Can someone
                        pull everything together?
                      </div>
                    </div>
                  </div>

                  {/* User message */}
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5b5fc7] text-xs font-semibold text-white">
                      SM
                    </span>
                    <div className="min-w-0">
                      <p className="mb-1 text-xs text-[#616161]">
                        Sarah Mokoena <span className="ml-2">09:14</span>
                      </p>
                      <div className="rounded-lg rounded-tl-none bg-[#e8ebfa] px-4 py-3 text-[15px] leading-snug text-[#242424]">
                        <span className="font-semibold text-[#5b5fc7]">
                          {COMMAND.slice(0, 6)}
                        </span>
                        {COMMAND.slice(6, typed)}
                        {!reduced && typed < COMMAND.length && (
                          <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-[#242424]" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Orgni reply */}
                  <motion.div
                    animate={{ opacity: typed === COMMAND.length ? 1 : 0, y: typed === COMMAND.length ? 0 : 8 }}
                    transition={{ duration: 0.3 }}
                    className="flex items-start gap-3"
                    aria-hidden={typed !== COMMAND.length}
                  >
                        <img
                          src={`${import.meta.env.BASE_URL}orgni-logo.png`}
                          alt="Orgni"
                          className="h-8 w-8 shrink-0 rounded-full object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="mb-1 text-xs text-[#616161]">
                            Orgni{" "}
                            <span className="ml-1 rounded bg-[#e1dfdd] px-1 text-[10px] font-medium">
                              APP
                            </span>
                            <span className="ml-2">09:14</span>
                          </p>
                          <div className="rounded-lg rounded-tl-none border border-[#e1dfdd] bg-white px-4 py-3 text-[15px] text-[#242424]">
                            <p className="min-h-[2.6em] leading-snug">
                              {ready
                                ? "Done. Here is the brief for tomorrow’s 10:00 with Halden Logistics, shared with everyone here."
                                : "On it, Sarah. Preparing everything for tomorrow’s meeting…"}
                            </p>
                            <ul className="mt-3 space-y-2">
                              {steps.map((step, i) => {
                                const complete = i < done;
                                const current = i === done && !ready;
                                return (
                                  <li
                                    key={step}
                                    className={`flex items-center gap-2.5 text-sm transition-colors duration-300 ${
                                      complete
                                        ? "text-[#242424]"
                                        : current
                                          ? "text-[#616161]"
                                          : "text-[#a19f9d]"
                                    }`}
                                  >
                                    <span
                                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${
                                        complete
                                          ? "bg-[#13a10e] text-white"
                                          : current
                                            ? "border border-[#5b5fc7]"
                                            : "border border-[#c8c6c4]"
                                      }`}
                                    >
                                      {complete && (
                                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                      )}
                                      {current && (
                                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#5b5fc7]" />
                                      )}
                                    </span>
                                    {step}
                                  </li>
                                );
                              })}
                            </ul>
                            <motion.div
                              animate={{ opacity: ready ? 1 : 0, y: ready ? 0 : 6 }}
                              transition={{ duration: 0.3 }}
                              className="mt-4 flex items-center gap-3 rounded-md border border-[#e1dfdd] bg-[#faf9f8] px-3 py-2.5"
                              aria-hidden={!ready}
                            >
                                  <span className="flex h-9 w-9 items-center justify-center rounded bg-[#2b579a] text-white">
                                    <FileText className="h-4 w-4" />
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">
                                      Halden Logistics – Meeting brief.docx
                                    </p>
                                    <p className="text-xs text-[#616161]">
                                      Shared with the group · Ready
                                    </p>
                                  </div>
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                </div>

                {/* Compose box */}
                <div className="border-t border-[#e1dfdd] bg-white px-4 py-3">
                  <div className="flex items-center justify-between rounded-md border border-[#c8c6c4] px-3 py-2 text-sm text-[#a19f9d]">
                    Message Halden Logistics – Account team
                    <Send className="h-4 w-4 text-[#5b5fc7]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
