import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { API_SIGNUP_URL } from "@/lib/links";
import {
  Bot,
  Check,
  Copy,
  ShieldCheck,
  Search,
  GitBranch,
  Scale,
  Plug,
  Book,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-white/40 hover:text-white transition-colors flex items-center justify-center w-6 h-6"
      title="Copy code"
      aria-label="Copy code"
    >
      {copied ? (
        <Check size={14} className="text-green-400" />
      ) : (
        <Copy size={14} />
      )}
    </button>
  );
}

function CodeBlock({
  title,
  copyText,
  children,
}: {
  title: string;
  copyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0c0c0c] font-mono text-sm shadow-xl w-full">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
        <span className="text-xs text-white/50">{title}</span>
        <CopyButton text={copyText} />
      </div>
      <div className="p-4 overflow-x-auto">{children}</div>
    </div>
  );
}

export default function Agents() {
  useSeo({
    title: "Agents - Orgni",
    description:
      "Build AI agents that act on verified organisational context. Connect via MCP or the Agent Context API with permissions enforced on every call.",
    path: "/agents",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary flex flex-col">
      <SiteHeader />
      <main className="flex-1 pt-16">
        <Hero />
        <Capabilities />
        <ExampleFlow />
        <AgentQuickstart />
        <Guardrails />
        <NextSteps />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="py-24 md:py-32 px-6 max-w-screen-xl mx-auto flex flex-col items-center text-center"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium tracking-wide uppercase mb-8">
        <Bot size={14} />
        Agents
      </div>
      <h1 className="text-4xl md:text-6xl lg:text-7xl font-medium tracking-tight text-foreground mb-6 max-w-4xl leading-[1.1]">
        Give your agent real company data
      </h1>
      <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 leading-relaxed">
        Building an AI agent? Orgni is the API it calls to know your
        company&apos;s contracts, invoices, people and rules. No guessing, no
        hallucinated answers.
      </p>
      <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
        <Button
          asChild
          size="lg"
          className="w-full sm:w-auto h-12 px-8 font-medium shadow-none rounded-md bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          <a href={API_SIGNUP_URL}>Get an API Key</a>
        </Button>
        <Button
          asChild
          size="lg"
          variant="outline"
          className="w-full sm:w-auto h-12 px-8 font-medium shadow-none rounded-md"
        >
          <Link href="/docs">Read the Docs</Link>
        </Button>
      </div>
    </motion.section>
  );
}

export function Capabilities() {
  const items = [
    {
      icon: Search,
      title: "Answers with receipts",
      desc: "Your agent asks a question and gets the answer plus the documents that prove it.",
    },
    {
      icon: ShieldCheck,
      title: "Built-in permissions",
      desc: "Your agent only sees what it is allowed to see. You don't write that logic yourself.",
    },
    {
      icon: GitBranch,
      title: "Connected records",
      desc: "One call returns a contract with its invoices, payments and owners already linked.",
    },
    {
      icon: Scale,
      title: "\u201CAm I allowed?\u201D checks",
      desc: "Ask Orgni if an action is allowed before your agent does it. It checks the rules for you.",
    },
  ];

  return (
    <section className="mx-auto max-w-[1600px] border-x border-b border-border px-6 py-20 md:px-12 md:py-28">
      <div className="max-w-2xl mb-16">
        <h2 className="mb-4 font-serif text-4xl leading-[1.02] md:text-6xl">
          What your agent gets
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Works with any framework: LangChain, the OpenAI SDK, or plain fetch
          calls.
        </p>
      </div>
      <div className="grid gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="bg-background p-6 transition-colors hover:bg-muted"
          >
            <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center mb-5">
              <item.icon className="text-primary" size={18} />
            </div>
            <h3 className="font-medium text-base mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {item.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function ExampleFlow() {
  const steps = [
    {
      n: "1",
      title: "Your agent asks",
      desc: "\u201CCan supplier invoice INV-2048 be approved?\u201D One API call, no digging through emails, policies or ledgers.",
      code: `POST /v1/context/query

{
  "agent_id": "procurement-agent",
  "objective": "Can invoice INV-2048 be approved?",
  "entities": {
    "invoice_id": "INV-2048",
    "supplier_id": "SUP-019"
  }
}`,
      codeTitle: "request",
    },
    {
      n: "2",
      title: "Orgni answers with a decision",
      desc: "Not just data. Orgni checks the invoice, the purchase order, the supplier and the company's own rules, then says what's blocking and why.",
      code: `{
  "decision_status": "blocked",
  "reason": "Supplier bank details changed 2 days ago.
    Payments over R25,000 need finance verification.",
  "recommended_action": {
    "action": "request_finance_verification",
    "assigned_role": "finance-manager"
  },
  "evidence": [
    "Invoice INV-2048",
    "Purchase order PO-8821",
    "Approval policy FIN-APR-07"
  ]
}`,
      codeTitle: "response",
    },
    {
      n: "3",
      title: "Your agent acts safely",
      desc: "Instead of paying a possibly-hijacked account, it routes the invoice to the finance manager, with the evidence attached.",
      code: `{
  "action": "create_approval_request",
  "assigned_to": "finance-manager",
  "reason": "Bank details need verification before payment."
}`,
      codeTitle: "agent action",
    },
  ];

  return (
    <section className="mx-auto max-w-[1600px] border-x border-b border-border px-6 py-20 md:px-12 md:py-28">
      <div className="max-w-2xl mb-16">
        <h2 className="mb-4 font-serif text-4xl leading-[1.02] md:text-6xl">
          See one call, start to finish
        </h2>
        <p className="text-lg text-muted-foreground leading-relaxed">
          A procurement agent wants to pay a supplier. Here is the whole
          conversation with Orgni.
        </p>
      </div>
      <div className="space-y-12">
        {steps.map((s) => (
          <div
            key={s.n}
            className="grid lg:grid-cols-2 gap-6 lg:gap-12 items-start"
          >
            <div className="lg:pt-2">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shrink-0">
                  {s.n}
                </span>
                <h3 className="text-xl font-medium">{s.title}</h3>
              </div>
              <p className="text-muted-foreground leading-relaxed lg:pl-10">
                {s.desc}
              </p>
            </div>
            <CodeBlock title={s.codeTitle} copyText={s.code}>
              <pre className="text-white/80 leading-relaxed text-xs md:text-sm font-mono whitespace-pre">
                {s.code}
              </pre>
            </CodeBlock>
          </div>
        ))}
      </div>
      <div className="mt-14 max-w-3xl border-l-4 border-primary bg-primary/5 p-6 md:p-8">
        <p className="text-base md:text-lg font-medium text-foreground leading-relaxed">
          Your agent asks &quot;what should I do?&quot; and Orgni answers with
          the current state, the rule that applies, the evidence, the
          responsible person and the permitted next step.
        </p>
      </div>
    </section>
  );
}

export function AgentQuickstart() {
  const mcpConfig = `{
  "mcpServers": {
    "orgni": {
      "url": "https://mcp.orgni.com/v1",
      "headers": {
        "Authorization": "Bearer orgni_live_xxxxxxxx"
      }
    }
  }
}`;

  const sdkExample = `import { Orgni } from "@orgni/sdk";

const orgni = new Orgni({ apiKey: process.env.ORGNI_API_KEY });

// Your agent asks: "can I approve this invoice?"
const result = await orgni.context.query({
  agentId: "procurement-agent",
  objective: "Can supplier invoice INV-2048 be approved?",
  entities: { invoiceId: "INV-2048", supplierId: "SUP-019" },
});

// Orgni answers with a decision, the rule, and the evidence
result.decisionStatus;              // "blocked"
result.recommendedAction.action;    // "request_finance_verification"
result.recommendedAction.reason;    // "Supplier bank details changed 2 days ago"
result.evidence;                    // ["Invoice INV-2048", "Policy FIN-APR-07", ...]`;

  return (
    <section className="py-24 bg-[#050505] text-white px-6">
      <div className="max-w-screen-xl mx-auto">
        <div className="max-w-2xl mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-medium tracking-wide uppercase mb-6">
            <Plug size={14} />
            Two ways to connect
          </div>
          <h2 className="mb-4 font-serif text-4xl leading-[1.02] md:text-6xl">
            Two ways to connect, pick one
          </h2>
          <p className="text-lg text-white/60 leading-relaxed">
            Using Claude, Cursor or another MCP client? Paste the config.
            Writing your own code? Install the SDK. Same data either way.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          <div>
            <h3 className="font-medium text-white mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                1
              </span>
              MCP: paste this config, done
            </h3>
            <CodeBlock title="mcp.json" copyText={mcpConfig}>
              <pre className="text-white/80 leading-relaxed text-xs md:text-sm font-mono whitespace-pre">
                {mcpConfig}
              </pre>
            </CodeBlock>
          </div>
          <div>
            <h3 className="font-medium text-white mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                2
              </span>
              SDK: one call gets the context
            </h3>
            <CodeBlock title="agent.ts" copyText={sdkExample}>
              <pre className="text-white/80 leading-relaxed text-xs md:text-sm font-mono whitespace-pre">
                {sdkExample}
              </pre>
            </CodeBlock>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Guardrails() {
  const rows = [
    {
      title: "Your agent has its own login",
      desc: "It acts under its own name with its own role, never as an all-access admin.",
    },
    {
      title: "Every answer shows its sources",
      desc: "Responses link back to the original documents, so anyone can verify them.",
    },
    {
      title: "Disagreements are flagged",
      desc: "If two systems say different things, your agent sees both and can ask a human.",
    },
    {
      title: "Everything is logged",
      desc: "Every question your agent asked and every check it ran is recorded for review.",
    },
  ];

  return (
    <section className="mx-auto max-w-[1600px] border-x border-b border-border px-6 py-20 md:px-12 md:py-28">
      <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
        <div>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 mb-6">
            <ShieldCheck className="text-primary" size={24} />
          </div>
          <h2 className="mb-4 font-serif text-4xl leading-[1.02] md:text-6xl">
            Safety you don&apos;t have to build
          </h2>
          <p className="text-lg text-muted-foreground max-w-md leading-relaxed">
            The scary parts of shipping an agent, permissions, audit logs and
            &quot;why did it do that?&quot;, are handled for you.
          </p>
        </div>
        <div className="divide-y divide-border overflow-hidden border border-border">
          {rows.map((row) => (
            <div key={row.title} className="p-6 bg-muted/20">
              <h3 className="font-medium text-base mb-1.5">{row.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {row.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function NextSteps() {
  return (
    <section className="py-24 px-6 max-w-screen-xl mx-auto border-t border-border">
      <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-10">
        Where to go next
      </h2>
      <div className="grid md:grid-cols-2 gap-6 max-w-4xl">
        <Link
          href="/docs"
          className="group block p-8 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all"
        >
          <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-6">
            <Book className="text-primary" size={24} />
          </div>
          <h3 className="text-xl font-medium mb-3 group-hover:text-primary transition-colors">
            Documentation
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            Core concepts, integration guides, and the complete REST API
            reference.
          </p>
        </Link>
        <Link
          href="/developers"
          className="group block p-8 rounded-xl border border-border bg-muted/20 hover:bg-muted/40 hover:border-primary/30 transition-all"
        >
          <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-6">
            <Terminal className="text-primary" size={24} />
          </div>
          <h3 className="text-xl font-medium mb-3 group-hover:text-primary transition-colors">
            Developer overview
          </h3>
          <p className="text-muted-foreground leading-relaxed">
            The API surface, authentication, and what the organisational model
            exposes.
          </p>
        </Link>
      </div>
    </section>
  );
}
