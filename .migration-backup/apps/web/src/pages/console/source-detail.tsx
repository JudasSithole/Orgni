import { getDocument } from "@/lib/api";
import { useData, ErrorState, DefensiveDisplay } from "./shared";
import { useParams, Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";

export default function SourceDetail() {
  const params = useParams();
  const { data, loading, error } = useData(
    (token) => getDocument(token, params.id!),
    params.id,
  );

  if (loading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const { source, tokens, facts } = data;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <Link
          href="/app/sources"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back to sources
        </Link>
        <h1 className="mb-2 break-words text-2xl font-semibold tracking-tight">
          {source.filename}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs font-normal">
            {source.documentType || "UNKNOWN"}
          </Badge>
          <Badge
            variant={source.state === "COMPLETED" ? "default" : "outline"}
            className="font-mono text-xs"
          >
            {source.state}
          </Badge>
          <span className="min-w-0 break-all font-mono text-xs text-muted-foreground">
            ID: {source.sourceId}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold mb-3 border-b border-border pb-2">
              Extracted Entities
            </h3>
            <div className="bg-card border border-border rounded-lg p-4">
              {facts?.entities && facts.entities.length > 0 ? (
                <ul className="space-y-3 text-sm">
                  {facts.entities.map((e, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 border-b border-border/50 last:border-0 pb-3 last:pb-0"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5 shrink-0" />
                      <DefensiveDisplay data={e} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No entities extracted.
                </p>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3 border-b border-border pb-2">
              Verified Facts
            </h3>
            <div className="bg-card border border-border rounded-lg p-4">
              {facts?.facts && facts.facts.length > 0 ? (
                <ul className="space-y-4 text-sm">
                  {facts.facts.map((f, i) => (
                    <li
                      key={i}
                      className="border-b border-border/50 last:border-0 pb-4 last:pb-0"
                    >
                      <div className="text-[10px] text-muted-foreground mb-1.5 font-mono uppercase tracking-wider">
                        {f.epistemic_status || f.fact_kind || "ASSERTED"}
                      </div>
                      <DefensiveDisplay data={f} />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No facts extracted.
                </p>
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          {source.warnings && source.warnings.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-3 border-b border-border pb-2 text-foreground">
                Refused Assertions
              </h3>
              <div className="bg-neutral-100 border border-neutral-300 dark:bg-neutral-900 dark:border-neutral-700 rounded-lg p-4">
                <ul className="space-y-2 text-sm text-neutral-800 dark:text-neutral-200">
                  {source.warnings.map((w, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="shrink-0">•</span>
                      <span className="leading-relaxed">{w}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          <section>
            <h3 className="text-sm font-semibold mb-3 border-b border-border pb-2">
              Organizational Tokens
            </h3>
            <div className="bg-card border border-border rounded-lg p-4">
              {tokens && tokens.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tokens.map((t, i) => (
                    <Badge
                      key={i}
                      variant="outline"
                      className="max-w-full whitespace-normal break-all py-0.5 font-mono text-[10px] font-normal"
                    >
                      {String(t["tokenKind"] || "TOKEN")} ·{" "}
                      {String(t["eventType"] || t["predicate"] || "...")}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">
                  No tokens mapped.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
