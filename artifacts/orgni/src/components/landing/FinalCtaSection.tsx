import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { LOGIN_URL } from "@/lib/links";

export function FinalCtaSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
        <div className="hidden border-r border-border p-8 lg:col-span-2 lg:flex lg:flex-col lg:justify-between">
          <span className="orgni-index">ORG / NEXT</span>
          <span className="font-serif text-6xl leading-none text-primary">→</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="px-6 py-20 md:px-12 md:py-28 lg:col-span-7"
        >
          <p className="orgni-kicker mb-10">Put context to work</p>
          <h2 className="font-serif text-5xl leading-[0.98] md:text-7xl">
            Operate on
            <br />
            <span className="text-primary">reality.</span>
          </h2>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Give teams, applications, and AI a live model of the organisation
            they can inspect and trust.
          </p>
        </motion.div>

        <div className="grid border-t border-border lg:col-span-3 lg:border-l lg:border-t-0">
          <a
            href={LOGIN_URL}
            className="group flex min-h-52 flex-col justify-between bg-primary p-7 text-primary-foreground transition-colors hover:bg-foreground md:p-10"
          >
            <span className="orgni-index !text-primary-foreground/70">
              Start a conversation
            </span>
            <div className="flex items-end justify-between">
              <span className="font-serif text-4xl leading-none">
                Request
                <br />
                demo
              </span>
              <ArrowUpRight className="h-8 w-8 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
            </div>
          </a>
          <a
            href="mailto:hello@olyxee.com"
            className="flex min-h-28 items-center justify-between border-t border-border p-7 font-mono text-xs font-bold uppercase transition-colors hover:bg-muted md:p-10"
          >
            Contact sales
            <ArrowUpRight className="h-5 w-5" />
          </a>
        </div>
      </div>
    </section>
  );
}
