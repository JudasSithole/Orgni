/**
 * Knowledge — "What Orgni understands", as an interactive map built from the
 * model API. Empty until Orgni has processed real information.
 */
import { useState } from "react";
import { Link } from "wouter";
import { Network, List as ListIcon } from "lucide-react";
import { useOrgni } from "@/lib/orgni/service";
import { PageHeader } from "@/components/app/primitives";
import { PageSkeleton, EmptyState } from "@/components/app/states";
import { KnowledgeGraph, CATEGORY_LABEL } from "@/components/app/knowledge-graph";
import type { KnowledgeCategory } from "@/lib/orgni/types";
import { relativeTime } from "@/lib/orgni/format";

const ORDER: KnowledgeCategory[] = [
  "people",
  "customers",
  "suppliers",
  "projects",
  "policies",
  "documents",
  "processes",
];

export default function Knowledge() {
  const { state, loading } = useOrgni();
  const [view, setView] = useState<"graph" | "list">("graph");
  const kn = state.knowledge;

  if (loading && !state.organisation) return <PageSkeleton />;

  const summary = ORDER.filter((c) => (kn.counts[c] ?? 0) > 0)
    .map((c) => `${kn.counts[c]} ${CATEGORY_LABEL[c].toLowerCase()}`)
    .slice(0, 4)
    .join(" · ");

  return (
    <div className="flex h-full flex-col gap-4 animate-in fade-in duration-300">
      <PageHeader
        title="What Orgni understands"
        description={
          summary
            ? `${summary}${kn.lastUpdatedAt ? ` — updated ${relativeTime(kn.lastUpdatedAt)}` : ""}`
            : "Orgni builds this from the information your organisation already uses."
        }
        action={
          kn.graph.nodes.length > 0 ? (
            <div className="inline-flex overflow-hidden rounded-lg border border-border">
              {(
                [
                  ["graph", Network, "Map"],
                  ["list", ListIcon, "List"],
                ] as const
              ).map(([key, Icon, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setView(key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium ${
                    view === key
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>
          ) : undefined
        }
      />

      {kn.state === "learning" ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Orgni is processing what you've added…
        </div>
      ) : null}

      {kn.graph.nodes.length === 0 ? (
        kn.state === "learning" ? null : (
          <EmptyState
            title="Nothing yet"
            description="Connect Microsoft 365 or add files, and Orgni will start building context automatically."
            action={
              <Link
                href="/app/settings/connections"
                className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background"
              >
                Add knowledge
              </Link>
            }
          />
        )
      ) : view === "graph" ? (
        <KnowledgeGraph data={kn.graph} />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
          {kn.graph.nodes.map((o) => (
            <li
              key={o.id}
              className="flex items-center justify-between gap-3 px-4 py-3.5 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium">{o.label}</div>
                <div className="truncate text-xs text-muted-foreground">{o.detail}</div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {CATEGORY_LABEL[o.category]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
