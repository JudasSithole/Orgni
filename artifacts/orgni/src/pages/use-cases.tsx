import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Headset,
  Landmark,
  Settings2,
  Truck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ActivityItem, type Activity } from "@/components/landing/motion-page/ActivityItem";
import { KeepMovingCta } from "@/components/landing/motion-page/KeepMovingCta";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useSeo } from "@/hooks/use-seo";

type UseCase = {
  id: string;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
  request: string;
  activity: Activity[];
  result: string;
  helps: string[];
};

const useCases: UseCase[] = [
  {
    id: "logistics",
    label: "Logistics",
    icon: Truck,
    title: "Keep shipments moving without chasing updates.",
    description:
      "Orgni tracks what is happening across carriers, suppliers, and customers and handles the routine follow-through.",
    request: "@Orgni where is the Halden order and who needs to know?",
    activity: [
      { kind: "system", source: "Carrier tracking", note: "Order #HL-2291 · departed supplier 07:40", icon: "database" },
      { kind: "system", source: "Outlook", note: "Supplier thread with Meridian Freight, 6 messages", icon: "mail" },
      { kind: "person", name: "David Naidoo", initials: "DN", via: "Teams", note: "confirmed the new delivery window" },
      { kind: "file", name: "Halden – Delivery update.docx", type: "docx", meta: "drafted for the customer" },
    ],
    result:
      "The shipment left the supplier this morning. Customer update drafted and ready to send.",
    helps: [
      "Track shipments and exceptions",
      "Coordinate updates across teams",
      "Answer status questions instantly",
    ],
  },
  {
    id: "finance",
    label: "Finance",
    icon: Landmark,
    title: "Answer money questions and move approvals along.",
    description:
      "Orgni finds the invoices, follows up on payments, and routes approvals so nothing waits on a person.",
    request: "@Orgni which supplier invoices are still waiting on approval?",
    activity: [
      { kind: "system", source: "Xero", note: "4 supplier invoices awaiting approval", icon: "database" },
      { kind: "file", name: "INV-2048 – Meridian Freight.pdf", type: "pdf", meta: "due in 6 days" },
      { kind: "file", name: "INV-2051 – Cape Packaging.pdf", type: "pdf", meta: "due in 9 days" },
      { kind: "person", name: "Aisha Patel", initials: "AP", via: "Email", note: "reminded: 2 invoices waiting on her" },
    ],
    result:
      "Four invoices are waiting. Reminders sent to the three approvers involved.",
    helps: [
      "Retrieve invoices and payment status",
      "Route approvals to the right person",
      "Follow up automatically",
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: Users,
    title: "Walk into every meeting prepared.",
    description:
      "Orgni gathers account history, open issues, and recent conversations so the team can focus on the customer.",
    request: "@Orgni prepare everything for tomorrow’s client meeting.",
    activity: [
      { kind: "system", source: "Outlook", note: "12 emails with Halden Logistics, last 30 days", icon: "mail" },
      { kind: "file", name: "Halden Logistics – Proposal v3.pdf", type: "pdf", meta: "sent 2 weeks ago" },
      { kind: "system", source: "Salesforce", note: "Account history, 3 open opportunities", icon: "database" },
      { kind: "file", name: "Halden Logistics – Meeting brief.docx", type: "docx", meta: "shared with the account team" },
    ],
    result: "Meeting brief ready and shared with the account team.",
    helps: [
      "Prepare account context",
      "Surface open issues before calls",
      "Coordinate follow-ups",
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: Settings2,
    title: "See what is blocked, and who can unblock it.",
    description:
      "Orgni understands the dependencies between people, systems, and deadlines, and points to the next action.",
    request: "@Orgni what is blocking the warehouse go-live?",
    activity: [
      { kind: "system", source: "Jira", note: "WH-GOLIVE · 3 of 14 tasks still open", icon: "database" },
      { kind: "person", name: "Sipho Dlamini", initials: "SD", via: "GitHub", note: "PR #412 blocked on scanner integration" },
      { kind: "file", name: "Scanner supplier – SLA.pdf", type: "pdf", meta: "delivery commitment: Friday" },
      { kind: "person", name: "Thabo Khumalo", initials: "TK", via: "Teams", note: "notified as go-live owner" },
    ],
    result:
      "One dependency is blocking go-live. The owner has been notified with the details.",
    helps: [
      "Identify blockers and dependencies",
      "See owners and deadlines",
      "Reduce unnecessary handoffs",
    ],
  },
  {
    id: "customer-service",
    label: "Customer service",
    icon: Headset,
    title: "Handle routine requests, escalate the rest.",
    description:
      "Orgni understands the request, finds the context, and resolves the routine cases so people can focus on exceptions.",
    request: "@Orgni a customer is asking for a copy of their March invoice.",
    activity: [
      { kind: "system", source: "HubSpot", note: "Contact matched: Nomsa Zulu, Brightline Retail", icon: "database" },
      { kind: "file", name: "INV-1877 – Brightline Retail.pdf", type: "pdf", meta: "March 2026 · paid" },
      { kind: "person", name: "Nomsa Zulu", initials: "NZ", via: "Email", note: "replied with the invoice attached" },
    ],
    result: "Invoice sent to the customer. No further action needed.",
    helps: [
      "Resolve routine customer requests",
      "Retrieve context instantly",
      "Escalate exceptions with the full picture",
    ],
  },
  {
    id: "hr",
    label: "HR",
    icon: UserRound,
    title: "Support people without the back-and-forth.",
    description:
      "Orgni answers policy questions, supports onboarding, and handles internal requests within the right permissions.",
    request: "@Orgni set up onboarding for our new hire starting Monday.",
    activity: [
      { kind: "file", name: "Onboarding checklist – L. Mthembu.xlsx", type: "xlsx", meta: "created from template" },
      { kind: "system", source: "Calendar", note: "5 first-week sessions scheduled", icon: "calendar" },
      { kind: "person", name: "Aisha Patel", initials: "AP", via: "Teams", note: "asked to set up the laptop by Friday" },
      { kind: "file", name: "Employee handbook 2026.pdf", type: "pdf", meta: "shared with the new hire" },
    ],
    result: "Onboarding plan ready. Calendar invites sent to the team.",
    helps: [
      "Answer policy questions",
      "Support onboarding and scheduling",
      "Handle internal requests securely",
    ],
  },
];

export default function UseCases() {
  const [selectedId, setSelectedId] = useState(useCases[0].id);
  const selected =
    useCases.find((useCase) => useCase.id === selectedId) ?? useCases[0];

  useSeo({
    title: "Use cases - Orgni",
    description:
      "See how Orgni keeps work moving across logistics, finance, sales, operations, customer service, and HR.",
    path: "/use-cases",
  });

  return (
    <div className="min-h-screen overflow-x-clip bg-background font-sans text-foreground selection:bg-primary/20 selection:text-primary">
      <SiteHeader />
      <main className="flex-1 pt-[72px]">
        <section>
          <div className="mx-auto max-w-6xl px-6 pb-12 pt-20 md:pt-28">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="max-w-2xl"
            >
              <h1 className="font-serif text-4xl leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
                One operational layer. Across the business.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                Pick an area to see how teams give Orgni work and get the
                result.
              </p>
            </motion.div>
          </div>
        </section>

        <section>
          <div className="mx-auto max-w-6xl px-6 pb-20 md:pb-28">
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Orgni use cases"
            >
              {useCases.map((useCase) => {
                const active = useCase.id === selected.id;
                return (
                  <button
                    key={useCase.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    aria-controls="use-case-panel"
                    onClick={() => setSelectedId(useCase.id)}
                    className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
                      active
                        ? "bg-foreground text-background"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <useCase.icon className="h-4 w-4 shrink-0" />
                    {useCase.label}
                  </button>
                );
              })}
            </div>

            <div id="use-case-panel" role="tabpanel" className="mt-10">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                  className="grid min-w-0 gap-12 lg:grid-cols-[2fr_3fr] lg:gap-16"
                >
                  <div className="min-w-0">
                    <h2 className="font-serif text-3xl leading-tight tracking-tight md:text-4xl">
                      {selected.title}
                    </h2>
                    <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
                      {selected.description}
                    </p>
                    <ul className="mt-8 grid gap-3">
                      {selected.helps.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-3 text-base font-medium"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <Check className="h-3.5 w-3.5" strokeWidth={3} />
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="min-w-0 rounded-2xl border border-border bg-muted/40 p-6 md:p-8">
                    <p className="text-sm font-medium text-muted-foreground">
                      Request
                    </p>
                    <p className="mt-2 text-lg font-medium leading-snug md:text-xl">
                      <span className="text-primary">
                        {selected.request.slice(0, 6)}
                      </span>
                      {selected.request.slice(6)}
                    </p>

                    <div className="mt-6 rounded-xl border border-border bg-background p-5">
                      <div className="flex items-center gap-3">
                        <img
                          src={`${import.meta.env.BASE_URL}orgni-logo.png`}
                          alt="Orgni"
                          className="h-7 w-7 rounded-full object-cover"
                        />
                        <span className="text-sm font-medium">Orgni</span>
                      </div>
                      <div className="mt-4 space-y-1.5">
                        {selected.activity.map((item, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.15 + i * 0.15 }}
                          >
                            <ActivityItem item={item} index={i} state="done" />
                          </motion.div>
                        ))}
                      </div>
                      <motion.p
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15 + selected.activity.length * 0.15 + 0.1 }}
                        className="mt-5 border-t border-border pt-4 text-base leading-relaxed"
                      >
                        {selected.result}
                      </motion.p>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        <KeepMovingCta />
      </main>
      <SiteFooter />
    </div>
  );
}
