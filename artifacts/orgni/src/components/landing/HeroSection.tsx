import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { LOGIN_URL } from "@/lib/links";

const industries = [
  { label: "Financial services and insurance", color: "#159947" },
  { label: "Banking and fintech", color: "#078A83" },
  { label: "Healthcare and medical services", color: "#D13C45" },
  { label: "Manufacturing", color: "#3F6F8F" },
  { label: "Logistics and transportation", color: "#087EA4" },
  { label: "Retail and e-commerce", color: "#C43E78" },
  { label: "Construction and engineering", color: "#C87900" },
  { label: "Mining and energy", color: "#9A6B10" },
  { label: "Telecommunications", color: "#7656C8" },
  { label: "Government and public sector", color: "#315CA8" },
  { label: "Legal and professional services", color: "#9F334F" },
  { label: "Accounting and audit", color: "#16856B" },
  { label: "Consulting", color: "#5557B7" },
  { label: "Education", color: "#2471A3" },
  { label: "Property and real estate", color: "#D15C22" },
  { label: "Agriculture", color: "#4D8C2B" },
  { label: "Hospitality and tourism", color: "#C14B8A" },
  { label: "Automotive", color: "#C83D32" },
  { label: "Technology and software", color: "#2563C7" },
  { label: "Non-profit organisations", color: "#8A4FA3" },
] as const;

export function HeroSection() {
  const [industryIndex, setIndustryIndex] = useState(0);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setIndustryIndex((current) => (current + 1) % industries.length);
    }, 2800);

    return () => window.clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <section className="orgni-grid border-b border-border pt-[72px]">
      <div className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1600px] border-x border-border lg:grid-cols-12">
        <aside className="hidden border-r border-border p-8 lg:col-span-1 lg:flex lg:flex-col lg:justify-between">
          <span className="orgni-index">ORG / 001</span>
          <span className="font-serif text-6xl leading-none text-primary">
            O
          </span>
        </aside>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="flex flex-col justify-center px-6 py-16 md:px-12 md:py-24 lg:col-span-7 lg:px-14"
        >
          <p className="orgni-kicker mb-10">
            Operational intelligence infrastructure
          </p>
          <h1 className="font-serif text-5xl leading-[0.98] md:text-7xl lg:text-8xl">
            Make your organisation understandable to intelligence.
          </h1>
          <p className="mt-8 font-mono text-xs font-bold uppercase text-muted-foreground">
            Built for
            <span
              className="relative mt-3 block min-h-[2.2em] text-lg leading-[1.3] text-primary md:min-h-[1.5em] md:text-xl"
              aria-live="polite"
              aria-atomic="true"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={industries[industryIndex].label}
                  initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={
                    prefersReducedMotion ? undefined : { opacity: 0, y: -12 }
                  }
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="block transition-colors duration-300"
                  style={{ color: industries[industryIndex].color }}
                >
                  {industries[industryIndex].label}
                </motion.span>
              </AnimatePresence>
            </span>
          </p>

          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Orgni connects organisational evidence, activity and systems into a
            living operational model that applications, people and AI agents can
            depend on.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href={LOGIN_URL}
              className="inline-flex min-h-14 items-center justify-between gap-8 bg-primary px-6 font-mono text-xs font-bold uppercase text-primary-foreground transition-colors hover:bg-foreground"
            >
              Open console
              <ArrowUpRight className="h-5 w-5" />
            </a>
            <Link
              href="/use-cases"
              className="inline-flex min-h-14 items-center justify-between gap-8 border border-border bg-background px-6 font-mono text-xs font-bold uppercase transition-colors hover:border-foreground"
            >
              Explore use cases
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative min-h-[480px] overflow-hidden border-t border-border bg-foreground lg:col-span-4 lg:min-h-0 lg:border-l lg:border-t-0"
        >
          <img
            src={`${import.meta.env.BASE_URL}orgni-product-ui.png`}
            alt="Orgni operational intelligence interface"
            className="absolute inset-0 h-full w-full object-cover object-left-top opacity-88"
          />
          <div className="absolute bottom-0 left-0 right-0 grid grid-cols-2 border-t border-white/25 bg-black/70 text-white backdrop-blur-md">
            <div className="border-r border-white/25 p-5">
              <p className="orgni-index mb-2 !text-white/55">Live state</p>
              <p className="font-mono text-xs">INVOICE_MATCHED</p>
            </div>
            <div className="p-5">
              <p className="orgni-index mb-2 !text-white/55">Evidence</p>
              <p className="font-serif text-2xl">Traceable</p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
