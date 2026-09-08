import { ArrowUpRight } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { OLYXEE_CONTACT_URL, ORGNI_PRODUCT_URL } from "@/lib/links";

export function KeepMovingCta() {
  return (
    <section className="bg-muted/40">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        className="mx-auto max-w-6xl px-6 py-24 text-center md:py-32"
      >
        <h2 className="font-serif text-4xl leading-tight tracking-tight md:text-6xl">
          Keep your business <span className="text-primary">moving.</span>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
          See how Orgni can become part of the way your organisation works.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={ORGNI_PRODUCT_URL} className="inline-flex h-12 items-center gap-2 rounded-full bg-foreground px-6 text-sm font-medium text-background transition-colors hover:bg-primary">
            Explore Orgni
            <ArrowUpRight className="h-4 w-4" />
          </Link>
          <a href={OLYXEE_CONTACT_URL} className="inline-flex h-12 items-center gap-2 rounded-full border border-border px-6 text-sm font-medium transition-colors hover:border-foreground">
            Talk to Olyxee
          </a>
        </div>
      </motion.div>
    </section>
  );
}
