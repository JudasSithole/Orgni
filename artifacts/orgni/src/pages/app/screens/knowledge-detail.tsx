/**
 * A single knowledge object — human-readable, showing what's related.
 */
import { Link, useParams } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Panel } from "@/components/app/primitives";
import { EmptyState } from "@/components/app/states";
import { DEMO_KNOWLEDGE_OBJECTS } from "@/lib/orgni/defaults";

export default function KnowledgeDetail() {
  const params = useParams();
  const obj = DEMO_KNOWLEDGE_OBJECTS.find((o) => o.id === params.id);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <Link
        href="/app/knowledge"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Knowledge
      </Link>

      {!obj ? (
        <EmptyState
          title="Not found"
          description="This item is no longer available."
        />
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-medium tracking-tight">{obj.name}</h1>
            {obj.subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{obj.subtitle}</p>
            ) : null}
          </div>

          <Panel>
            <div className="border-b border-border px-5 py-3 text-sm font-medium">
              Related
            </div>
            <dl className="divide-y divide-border">
              {obj.related.map((r) => (
                <div
                  key={r.label}
                  className="flex items-center justify-between px-5 py-3 text-sm"
                >
                  <dt className="text-muted-foreground">{r.label}</dt>
                  <dd>{r.value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <p className="text-xs text-muted-foreground">
            Orgni built this from connected systems and files. It updates as new
            information comes in.
          </p>
        </>
      )}
    </div>
  );
}
