import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  CheckCircle2,
  FileCheck2,
  Landmark,
  Link2,
  Scale,
  type LucideIcon,
} from "lucide-react";
import { FinalCtaSection } from "@/components/landing/FinalCtaSection";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { useSeo } from "@/hooks/use-seo";

type UseCase = {
  id: string;
  label: string;
  icon: LucideIcon;
  title: string;
  description: string;
  question: string;
  sources: string[];
  steps: string[];
  answer: string;
  outcome: string;
};

const useCases: UseCase[] = [
  {
    id: "finance",
    label: "Finance",
    icon: Landmark,
    title: "Know what is owed, paid, and still at risk.",
    description:
      "Connect contracts, invoices, approvals, and payments into one traceable money trail.",
    question: "What do we owe Acme Logistics today?",
    sources: ["Contract", "Invoice", "Approval", "Payment ledger"],
    steps: [
      "Find the active supplier agreement",
      "Match invoices and approval status",
      "Check recorded payments and due dates",
    ],
    answer:
      "R18,450 is outstanding and due in 18 days under the active Net 60 agreement.",
    outcome: "A reliable position with every supporting record attached.",
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: BriefcaseBusiness,
    title: "Approve purchases with the full commercial picture.",
    description:
      "Give procurement teams and agents the supplier, policy, order, and invoice context needed before approval.",
    question: "Can invoice INV-2048 be approved?",
    sources: ["Purchase order", "Supplier record", "Invoice", "Approval policy"],
    steps: [
      "Verify the invoice against its purchase order",
      "Check supplier status and recent account changes",
      "Apply the correct approval threshold",
    ],
    answer:
      "Approval is blocked until Finance verifies bank details changed two days ago.",
    outcome: "Risk is caught before payment, with the next action identified.",
  },
  {
    id: "legal",
    label: "Legal & compliance",
    icon: Scale,
    title: "Turn obligations into work that does not get missed.",
    description:
      "Extract duties, dates, owners, and evidence from agreements and policies, then keep them connected to live activity.",
    question: "Which obligations are due this month?",
    sources: ["Contracts", "Policies", "Email", "Ownership records"],
    steps: [
      "Identify active clauses and effective dates",
      "Resolve each obligation to its owner",
      "Check completion evidence and exceptions",
    ],
    answer:
      "Seven obligations are due; five are complete and two require evidence from Operations.",
    outcome: "A reviewable obligation register grounded in source documents.",
  },
  {
    id: "operations",
    label: "Operations",
    icon: FileCheck2,
    title: "See the operational state behind every commitment.",
    description:
      "Unify orders, documents, communications, and system events so teams can understand blockers without manual reconciliation.",
    question: "Why is the customer delivery delayed?",
    sources: ["Order system", "Logistics update", "Supplier email", "SLA"],
    steps: [
      "Trace the order and its dependencies",
      "Connect the latest supplier and carrier updates",
      "Compare the current state with the SLA",
    ],
    answer:
      "The shipment is held at the supplier; the revised delivery date breaches the SLA by two days.",
    outcome: "The cause, impact, owner, and evidence appear in one answer.",
  },
  {
    id: "agents",
    label: "AI agents",
    icon: Bot,
    title: "Give agents context before they answer or act.",
    description:
      "Let any agent query a governed organisational model instead of searching fragmented systems or inventing missing context.",
    question: "Am I allowed to release this payment?",
    sources: ["Agent identity", "Permissions", "Payment", "Company policy"],
    steps: [
      "Resolve the agent, task, and requested action",
      "Load applicable permissions and policies",
      "Evaluate evidence, conflicts, and missing context",
    ],
    answer:
      "No. Human approval is required because the amount exceeds the agent's delegated authority.",
    outcome: "Safe autonomy with a clear decision and an auditable reason.",
  },
];

export default function UseCases() {
  const [selectedId, setSelectedId] = useState(useCases[0].id);
  const selected =
    useCases.find((useCase) => useCase.id === selectedId) ?? useCases[0];

  useSeo({
    title: "Use Cases - Orgni",
    description:
      "See how Orgni connects business evidence into trusted answers for finance, procurement, compliance, operations, and AI agents.",
    path: "/use-cases",
  });

  return (
    <div className="min-h-screen overflow-x-clip bg-background font-sans text-foreground selection:bg-primary/20 selection:text-primary">
      <SiteHeader />
      <main className="flex-1 pt-16">
        <section className="orgni-grid border-b border-border">
          <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
            <aside className="hidden border-r border-border p-8 lg:col-span-2 lg:flex lg:flex-col lg:justify-between">
              <span className="orgni-index">ORG / UC-01</span>
              <span className="font-serif text-6xl text-primary">U</span>
            </aside>
            <div className="px-6 py-20 md:px-12 md:py-28 lg:col-span-10">
              <p className="orgni-kicker mb-10">Use cases</p>
              <h1 className="mb-8 max-w-5xl font-serif text-5xl leading-[0.98] md:text-7xl lg:text-8xl">
                Ask the business.
                <br />
                Get an answer with evidence.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
                Orgni connects the records behind a decision so teams,
                applications, and AI agents can understand what is true, why it
                is true, and what should happen next.
              </p>
            </div>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="mx-auto max-w-[1600px] border-x border-border px-6 py-16 md:px-12 md:py-20">
            <div
              className="mb-10 grid grid-cols-2 gap-2 md:flex"
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
                    className={`flex min-h-12 items-center justify-center gap-2 border px-4 py-3 font-mono text-[11px] font-bold uppercase transition-colors md:min-w-36 ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                    }`}
                  >
                    <useCase.icon className="h-4 w-4 shrink-0" />
                    {useCase.label}
                  </button>
                );
              })}
            </div>

            <div
              id="use-case-panel"
              role="tabpanel"
              className="border-y border-border bg-background"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.25 }}
                >
                  <header className="grid border-b border-border lg:grid-cols-12">
                    <div className="flex items-center gap-4 border-b border-border p-6 lg:col-span-3 lg:border-b-0 lg:border-r lg:p-8">
                      <selected.icon className="h-6 w-6 text-primary" />
                      <div>
                        <p className="orgni-index mb-1">Selected use case</p>
                        <p className="font-semibold">{selected.label}</p>
                      </div>
                    </div>
                    <div className="p-6 lg:col-span-9 lg:p-8">
                      <h2 className="font-serif text-3xl leading-[1.05] md:text-4xl">
                        {selected.title}
                      </h2>
                      <p className="mt-3 max-w-3xl leading-relaxed text-muted-foreground">
                        {selected.description}
                      </p>
                    </div>
                  </header>

                  <div className="grid lg:grid-cols-3">
                    <section className="flex min-h-72 flex-col justify-between border-b border-border p-7 md:p-10 lg:border-b-0 lg:border-r">
                      <div className="flex items-center justify-between">
                        <span className="orgni-index">01 / Question</span>
                        <ArrowRight className="h-5 w-5 text-primary" />
                      </div>
                      <p className="my-10 font-serif text-3xl leading-[1.18] md:text-4xl">
                        "{selected.question}"
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Asked by a team member, application, or AI agent.
                      </p>
                    </section>

                    <section className="flex min-h-72 flex-col bg-foreground p-7 text-background md:p-10">
                      <div className="flex items-center justify-between border-b border-background/20 pb-5">
                        <span className="orgni-index !text-background/55">
                          02 / Orgni resolves
                        </span>
                        <img
                          src={`${import.meta.env.BASE_URL}orgni-logo.png`}
                          alt=""
                          className="h-7 w-7"
                        />
                      </div>
                      <ol className="mt-7 space-y-5">
                        {selected.steps.map((step, index) => (
                          <li key={step} className="flex items-start gap-4">
                            <span className="font-mono text-xs text-primary">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            <span className="text-sm leading-relaxed text-background/80">
                              {step}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </section>

                    <section className="flex min-h-72 flex-col justify-between border-t border-border bg-primary/5 p-7 md:p-10 lg:border-l lg:border-t-0">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span className="orgni-index text-emerald-800">
                          03 / Grounded answer
                        </span>
                      </div>
                      <p className="my-10 text-xl font-semibold leading-snug md:text-2xl">
                        {selected.answer}
                      </p>
                      <p className="border-l-2 border-emerald-500 pl-4 text-sm leading-relaxed text-muted-foreground">
                        {selected.outcome}
                      </p>
                    </section>
                  </div>

                  <footer className="grid border-t border-border lg:grid-cols-12">
                    <div className="border-b border-border p-6 lg:col-span-3 lg:border-b-0 lg:border-r lg:p-8">
                      <p className="orgni-index">Evidence connected</p>
                    </div>
                    <div className="flex flex-wrap gap-2 p-6 lg:col-span-9 lg:p-8">
                      {selected.sources.map((source, index) => (
                        <span
                          key={source}
                          className="inline-flex items-center gap-3 border border-border px-4 py-2.5 text-sm font-medium"
                        >
                          <span className="font-mono text-[10px] text-primary">
                            E-{String(index + 1).padStart(2, "0")}
                          </span>
                          <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                          {source}
                        </span>
                      ))}
                    </div>
                  </footer>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        <FinalCtaSection />
      </main>
      <SiteFooter />
    </div>
  );
}
