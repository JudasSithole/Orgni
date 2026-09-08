import { motion } from "framer-motion";
import { ArrowUpRight, Linkedin, Mail, Phone } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useSeo } from "@/hooks/use-seo";
import {
  CONTACT_EMAIL,
  CONTACT_PHONE_DISPLAY,
  CONTACT_PHONE_TEL,
  LINKEDIN_URL,
} from "@/lib/links";

const channels = [
  {
    icon: Mail,
    label: "Email",
    value: CONTACT_EMAIL,
    href: `mailto:${CONTACT_EMAIL}`,
    note: "For demos, partnerships, and general questions.",
    external: false,
  },
  {
    icon: Phone,
    label: "Phone",
    value: CONTACT_PHONE_DISPLAY,
    href: `tel:${CONTACT_PHONE_TEL}`,
    note: "Call us during South African business hours.",
    external: false,
  },
  {
    icon: Linkedin,
    label: "LinkedIn",
    value: "linkedin.com/company/orgni",
    href: LINKEDIN_URL,
    note: "Follow product updates and company news.",
    external: true,
  },
];

export default function Contact() {
  useSeo({
    title: "Contact - Orgni",
    description: "Talk to the Orgni team by email, phone, or LinkedIn.",
    path: "/contact",
  });

  return (
    <div className="min-h-screen overflow-x-clip bg-background font-sans text-foreground selection:bg-primary/20 selection:text-primary">
      <SiteHeader />
      <main className="flex-1 pt-[72px]">
        <section>
          <div className="mx-auto max-w-6xl px-6 pb-20 pt-20 md:pb-28 md:pt-28">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <h1 className="font-serif text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                Talk to us.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Whether you want to see Orgni in your own business or have a
                question for the team, we usually reply within one working day.
              </p>
            </motion.div>

            <div className="mt-14 grid gap-4 md:grid-cols-3">
              {channels.map((channel, i) => (
                <motion.a
                  key={channel.label}
                  href={channel.href}
                  target={channel.external ? "_blank" : undefined}
                  rel={channel.external ? "noreferrer" : undefined}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
                  className="group flex flex-col justify-between rounded-2xl border border-border bg-muted/40 p-6 transition-colors hover:border-foreground/30 hover:bg-muted/70 md:p-7"
                >
                  <div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <channel.icon className="h-[18px] w-[18px]" />
                    </span>
                    <p className="mt-6 text-sm font-medium text-muted-foreground">
                      {channel.label}
                    </p>
                    <p className="mt-1 break-words text-lg font-medium leading-snug md:text-xl">
                      {channel.value}
                    </p>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {channel.note}
                    </p>
                  </div>
                  <span className="mt-8 inline-flex items-center gap-1.5 text-sm font-medium">
                    {channel.external ? "Open LinkedIn" : `Use ${channel.label.toLowerCase()}`}
                    <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </motion.a>
              ))}
            </div>

            <p className="mt-10 text-sm text-muted-foreground">
              Orgni is built by Olyxee, South Africa.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
