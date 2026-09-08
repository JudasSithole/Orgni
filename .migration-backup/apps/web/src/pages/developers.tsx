import { useSeo } from "@/hooks/use-seo";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { API_SIGNUP_URL } from "@/lib/links";
import {
  Check,
  Copy,
  Key,
  Book,
  Terminal,
  Layers,
  FileText,
  History,
  AlertTriangle,
  ArrowUpRight,
} from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import {
  Capabilities,
  ExampleFlow,
  AgentQuickstart,
  Guardrails,
} from "@/pages/agents";

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
  lineCount,
  copyText,
  children,
}: {
  title: string;
  lineCount: number;
  copyText: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0c0c0c] font-mono text-sm shadow-xl w-full">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white/5 border-b border-white/10">
        <span className="text-xs text-white/50">{title}</span>
        <CopyButton text={copyText} />
      </div>
      <div className="p-4 overflow-x-auto flex">
        <div className="pr-4 text-white/20 select-none text-right flex flex-col gap-1 border-r border-white/5 mr-4 min-w-[2rem]">
          {Array.from({ length: lineCount }).map((_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

export default function Developers() {
  useSeo({
    title: "Developers - Orgni",
    description:
      "Give your agents access to governed identity, relationships, policies, and operational state through a unified API.",
    path: "/developers",
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary flex flex-col">
      <SiteHeader />
      <main className="flex-1 pt-[72px]">
        <Hero />
        <AgentContextDiagram />
        <Capabilities />
        <ExampleFlow />
        <Exposes />
        <AgentQuickstart />
        <Auth />
        <Guardrails />
        <NextSteps />
      </main>
      <SiteFooter />
    </div>
  );
}

function Hero() {
  return (
    <section className="orgni-grid border-b border-border">
      <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
        <aside className="hidden border-r border-border p-8 lg:col-span-2 lg:flex lg:flex-col lg:justify-between">
          <span className="orgni-index">ORG / DEV-01</span>
          <Terminal className="h-12 w-12 text-primary" strokeWidth={1.25} />
        </aside>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="px-6 py-20 md:px-12 md:py-28 lg:col-span-10"
        >
          <p className="orgni-kicker mb-10">For developers and agents</p>
          <h1 className="max-w-5xl font-serif text-5xl leading-[0.98] md:text-7xl lg:text-8xl">
            A queryable model of how the organisation works.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
            Give any agent verified contracts, invoices, people, policies, and
            operational state through one governed interface.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a
              href={API_SIGNUP_URL}
              className="inline-flex min-h-14 items-center justify-between gap-8 bg-primary px-6 font-mono text-xs font-bold uppercase text-primary-foreground transition-colors hover:bg-foreground"
            >
              Get an API key
              <ArrowUpRight className="h-5 w-5" />
            </a>
            <Link
              href="/docs"
              className="inline-flex min-h-14 items-center justify-between gap-8 border border-border bg-background px-6 font-mono text-xs font-bold uppercase transition-colors hover:border-foreground"
            >
              Read the docs
              <ArrowUpRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function AgentContextDiagram() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-[1600px] border-x border-border lg:grid-cols-12">
        <div className="border-b border-border p-6 md:p-10 lg:col-span-4 lg:border-b-0 lg:border-r lg:p-12">
          <span className="orgni-index mb-16 block">ORG / DEV-02</span>
          <p className="orgni-kicker mb-8">How an agent uses Orgni</p>
          <h2 className="mb-5 font-serif text-4xl leading-[1.02] text-foreground md:text-6xl">
            One question. One trusted answer.
          </h2>
          <p className="text-lg leading-relaxed text-muted-foreground">
            The agent asks Orgni instead of searching every system itself.
            Orgni connects the relevant business data, applies context, and
            returns an answer the agent can use.
          </p>
        </div>
        <figure className="overflow-hidden bg-white lg:col-span-8">
          <div className="overflow-x-auto">
            <img
              src={`${import.meta.env.BASE_URL}agent-orgni-flow.png`}
              alt="Flow showing a user asking an AI agent about an outstanding supplier amount. The agent queries Orgni, which unifies Gmail, Microsoft Teams, documents, ERP systems, spreadsheets, and databases before returning a trusted answer."
              className="block h-auto min-w-[900px] md:min-w-0 md:w-full"
              loading="eager"
            />
          </div>
          <figcaption className="border-t border-black/15 px-5 py-4 font-mono text-[10px] uppercase text-black/55">
            Orgni sits between the agent and fragmented business systems,
            providing unified, real-time organisational context.
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Exposes() {
  return (
    <section className="border-b border-border bg-[#050505] text-white">
      <div className="mx-auto max-w-[1600px] border-x border-white/15 px-6 py-20 md:px-12 md:py-28">
        <div className="max-w-2xl mb-16">
          <h2 className="mb-4 font-serif text-4xl leading-[1.02] md:text-6xl">
            What Orgni exposes
          </h2>
          <p className="text-lg text-white/60 leading-relaxed">
            A single API endpoint that returns the complete operational and
            historical context an agent needs to make a decision about a
            resource.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Code side */}
          <div className="space-y-6">
            <CodeBlock
              title="request.ts"
              lineCount={6}
              copyText={`const context = await orgni.context.get({\n  actor: "compliance-agent",\n  task: "evaluate-control",\n  resource: "control_284",\n  asOf: new Date().toISOString()\n});`}
            >
              <pre className="text-white/80 leading-relaxed text-xs md:text-sm flex-1 font-mono">
                <span className="text-[#ff7b72]">const</span>{" "}
                <span className="text-[#79c0ff]">context</span>{" "}
                <span className="text-white/40">=</span>{" "}
                <span className="text-[#ff7b72]">await</span>{" "}
                <span className="text-white/90">orgni</span>
                <span className="text-white/40">.</span>
                <span className="text-white/90">context</span>
                <span className="text-white/40">.</span>
                <span className="text-[#d2a8ff]">get</span>
                <span className="text-white/40">(</span>
                <span className="text-[#ff7b72]">&#123;</span>
                {"\n  "}
                <span className="text-white/80">actor</span>
                <span className="text-[#ff7b72]">:</span>{" "}
                <span className="text-[#a5d6ff]">"compliance-agent"</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-white/80">task</span>
                <span className="text-[#ff7b72]">:</span>{" "}
                <span className="text-[#a5d6ff]">"evaluate-control"</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-white/80">resource</span>
                <span className="text-[#ff7b72]">:</span>{" "}
                <span className="text-[#a5d6ff]">"control_284"</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-white/80">asOf</span>
                <span className="text-[#ff7b72]">:</span>{" "}
                <span className="text-[#ff7b72]">new</span>{" "}
                <span className="text-[#79c0ff]">Date</span>
                <span className="text-white/40">().</span>
                <span className="text-[#d2a8ff]">toISOString</span>
                <span className="text-white/40">()</span>
                {"\n"}
                <span className="text-[#ff7b72]">&#125;</span>
                <span className="text-white/40">);</span>
              </pre>
            </CodeBlock>

            <CodeBlock
              title="response.json"
              lineCount={12}
              copyText={`{\n  "resource": {},\n  "applicableRequirements": [],\n  "currentState": {},\n  "evidence": [],\n  "owners": [],\n  "exceptions": [],\n  "conflicts": [],\n  "historicalEvents": [],\n  "permittedActions": [],\n  "missingContext": []\n}`}
            >
              <pre className="text-white/80 leading-relaxed text-xs md:text-sm flex-1 font-mono">
                <span className="text-[#ff7b72]">&#123;</span>
                {"\n  "}
                <span className="text-[#79c0ff]">"resource"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#ff7b72]">&#123;&#125;</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-[#79c0ff]">"applicableRequirements"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-[#79c0ff]">"currentState"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#ff7b72]">&#123;&#125;</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-[#79c0ff]">"evidence"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-[#79c0ff]">"owners"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-[#79c0ff]">"exceptions"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-[#79c0ff]">"conflicts"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-[#79c0ff]">"historicalEvents"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-[#79c0ff]">"permittedActions"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                <span className="text-white/40">,</span>
                {"\n  "}
                <span className="text-[#79c0ff]">"missingContext"</span>
                <span className="text-white/40">:</span>{" "}
                <span className="text-[#a5d6ff]">[]</span>
                {"\n"}
                <span className="text-[#ff7b72]">&#125;</span>
              </pre>
            </CodeBlock>
          </div>

          {/* Text side */}
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-10">
            {[
              {
                icon: Layers,
                title: "State & Identity",
                desc: "Canonical entity resolution and current verified state.",
              },
              {
                icon: FileText,
                title: "Applicable Rules",
                desc: "Filtered requirements by entity, role, and jurisdiction.",
              },
              {
                icon: History,
                title: "Evidence & History",
                desc: "Verified history, previous decisions, and source evidence.",
              },
              {
                icon: AlertTriangle,
                title: "Conflicts",
                desc: "Preserved conflicting claims marked for human review.",
              },
            ].map((item, i) => (
              <div key={i}>
                <div className="w-10 h-10 rounded-md bg-white/5 border border-white/10 flex items-center justify-center mb-4">
                  <item.icon className="text-primary" size={18} />
                </div>
                <h3 className="font-medium text-white text-base mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-white/50 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Auth() {
  return (
    <section className="mx-auto max-w-[1600px] border-x border-b border-border px-6 py-20 md:px-12 md:py-28">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 mb-6">
            <Key className="text-primary" size={24} />
          </div>
          <h2 className="mb-4 font-serif text-4xl leading-[1.02] md:text-6xl">
            Authentication
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            All requests to the Orgni API require a Bearer token. You can
            generate and manage API keys in your developer dashboard.
          </p>
          <Button asChild className="rounded-md h-11 px-6 shadow-none">
            <a href={API_SIGNUP_URL}>Get an API Key</a>
          </Button>
        </div>
        <div>
          <CodeBlock
            title="HTTP Request"
            lineCount={3}
            copyText={`GET /v1/context HTTP/1.1\nHost: api.orgni.com\nAuthorization: Bearer orgni_live_xxxxxxxx`}
          >
            <pre className="text-white/80 leading-relaxed text-xs md:text-sm flex-1 font-mono">
              <span className="text-[#79c0ff]">GET</span>{" "}
              <span className="text-white/90">/v1/context</span>{" "}
              <span className="text-white/40">HTTP/1.1</span>
              {"\n"}
              <span className="text-[#79c0ff]">Host:</span>{" "}
              <span className="text-white/90">api.orgni.com</span>
              {"\n"}
              <span className="text-[#79c0ff]">Authorization:</span>{" "}
              <span className="text-[#a5d6ff]">Bearer orgni_live_xxxxxxxx</span>
            </pre>
          </CodeBlock>
        </div>
      </div>
    </section>
  );
}

function NextSteps() {
  return (
    <section className="mx-auto max-w-[1600px] border-x border-b border-border px-6 py-20 md:px-12 md:py-28">
      <h2 className="mb-10 font-serif text-4xl leading-[1.02] md:text-6xl">
        Where to go next
      </h2>
      <div className="max-w-4xl">
        <Link
          href="/docs"
          className="group block border-l-4 border-primary bg-muted/20 p-8 transition-colors hover:bg-muted/40 md:p-10"
        >
          <div className="w-12 h-12 rounded-md bg-primary/10 flex items-center justify-center mb-6">
            <Book className="text-primary" size={24} />
          </div>
          <h3 className="text-xl font-medium mb-3 group-hover:text-primary transition-colors">
            Read the Documentation
          </h3>
          <p className="text-muted-foreground leading-relaxed max-w-2xl">
            Learn the core concepts, read integration guides, and explore the
            complete REST API documentation. See how to structure your agent to
            leverage the organisational model.
          </p>
        </Link>
      </div>
    </section>
  );
}
