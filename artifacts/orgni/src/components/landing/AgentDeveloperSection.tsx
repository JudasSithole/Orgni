import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export function AgentDeveloperSection() {
  const capabilities = [
    "Context retrieval via GraphQL / REST",
    "Real-time event subscriptions",
    "Evidence-backed state mutations",
    "Access control and auditing",
    "Policy validation pre-flight",
  ];

  return (
    <section
      id="developers"
      className="border-b border-border bg-background scroll-mt-20"
    >
      <div className="mx-auto max-w-[1600px] border-x border-border px-6 py-24 md:px-12 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-8 items-start">
          <div className="lg:col-span-5 relative">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground leading-[1.05] mb-8">
              A trusted grounding layer for AI agents.
            </h2>

            <p className="text-xl md:text-2xl text-foreground font-light leading-snug mb-12">
              Agents fail without correct context. Orgni provides a live,
              verifiable model of your business so AI can act safely.
            </p>

            <div className="space-y-6 mb-12">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground border-b border-border pb-2">
                Core Capabilities
              </h3>
              <ul className="space-y-4">
                {capabilities.map((cap, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-4 text-base font-medium"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                    {cap}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="h-14 rounded-none border-foreground px-8 text-base font-medium text-foreground transition-colors hover:bg-foreground hover:text-background"
            >
              <Link href="/developers">Read the Documentation</Link>
            </Button>
          </div>

          <div className="lg:col-span-6 lg:col-start-7 pt-12 lg:pt-0">
            <div className="bg-foreground text-background p-8 md:p-12 shadow-2xl relative">
              <div className="absolute top-0 right-0 p-4 border-b border-l border-background/20 font-mono text-[10px] text-background/50 uppercase tracking-widest">
                API.V1.GRAPHQL
              </div>
              <pre className="font-mono text-sm md:text-base leading-relaxed overflow-x-auto text-background/90 pt-8">
                <code className="language-graphql">
                  {`query GetAgentContext($entityId: ID!) {
  organisation(id: $entityId) {
    status
    activePolicies {
      id
      enforcementLevel
    }
    recentEvents(last: 5) {
      type
      timestamp
      actor
    }
    obligations(state: UNFULFILLED) {
      description
      dueDate
      severity
    }
  }
}`}
                </code>
              </pre>
              <div className="mt-8 pt-8 border-t border-background/20">
                <div className="flex items-center justify-between text-xs font-mono text-primary">
                  <span>RESPONSE: 200 OK</span>
                  <span>14ms</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
