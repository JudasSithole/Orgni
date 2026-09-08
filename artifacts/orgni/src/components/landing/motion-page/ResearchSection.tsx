import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { Link } from "wouter";
import { thesisData } from "@/data/thesis";

export function ResearchSection() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.45 }}
          className="px-6 py-12 md:px-12 md:py-16 lg:col-span-6 lg:border-r lg:border-border"
        >
          <p className="orgni-kicker mb-8">Research</p>
          <h2 className="max-w-xl font-serif text-3xl leading-tight md:text-4xl">
            Researching the infrastructure behind operational intelligence.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground">
            Olyxee publishes the thinking behind the platform: how organisations
            can be represented, governed, and kept current so that people,
            software, and intelligent systems act on the same operational
            reality.
          </p>
        </motion.div>

        <div className="grid border-t border-border lg:col-span-6 lg:border-t-0">
          <Link
            href="/thesis"
            className="group flex flex-col justify-between gap-6 border-b border-border p-6 transition-colors hover:bg-muted md:p-10"
          >
            <span className="orgni-index">Research thesis</span>
            <span className="flex items-end justify-between gap-6">
              <span className="max-w-md text-lg font-medium leading-snug">
                {thesisData.title}
              </span>
              <ArrowUpRight className="h-6 w-6 shrink-0 transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" />
            </span>
          </Link>
          <Link
            href="/research"
            className="flex min-h-20 items-center justify-between p-6 font-mono text-xs font-bold uppercase transition-colors hover:bg-muted md:px-10"
          >
            View the research programme
            <ArrowUpRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
