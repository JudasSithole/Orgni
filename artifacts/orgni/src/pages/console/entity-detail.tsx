import { getEntity } from "@/lib/api";
import { useData, ErrorState, DefensiveDisplay } from "./shared";
import { useParams, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function EntityDetail() {
  const params = useParams();
  const { data, loading, error } = useData(
    (token) => getEntity(token, params.id!),
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <Link
          href="/app/entities"
          className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Back to entities
        </Link>
        <h1 className="mb-2 break-words text-2xl font-semibold tracking-tight">
          {data.entity.name ? String(data.entity.name) : data.key}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs font-normal">
            Occurrences: {data.occurrences}
          </Badge>
          <span className="min-w-0 break-all font-mono text-xs text-muted-foreground">
            Key: {data.key}
          </span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-8">
          <section>
            <h3 className="text-sm font-semibold mb-3 border-b border-border pb-2">
              Properties
            </h3>
            <div className="bg-card rounded-lg p-3 border border-border">
              <DefensiveDisplay data={data.entity} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3 border-b border-border pb-2">
              Related Facts
            </h3>
            {data.facts.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No facts available.
              </p>
            ) : (
              <ul className="space-y-4">
                {data.facts.map((f, i) => (
                  <li
                    key={i}
                    className="text-sm p-3 border border-border rounded-lg bg-card"
                  >
                    <DefensiveDisplay data={f.fact} />
                    <div className="mt-3 flex min-w-0 items-start gap-1.5 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      Source:{" "}
                      <Link
                        href={`/app/sources/${f.source.sourceId}`}
                        className="min-w-0 break-words hover:underline"
                      >
                        {f.source.filename}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-8">
          <section>
            <h3 className="text-sm font-semibold mb-3 border-b border-border pb-2">
              Relationships
            </h3>
            {data.relationships.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No relationships mapped.
              </p>
            ) : (
              <ul className="space-y-4">
                {data.relationships.map((r, i) => (
                  <li
                    key={i}
                    className="text-sm p-3 border border-border rounded-lg bg-card"
                  >
                    <DefensiveDisplay data={r.relationship} />
                    <div className="mt-3 flex min-w-0 items-start gap-1.5 border-t border-border/50 pt-2 text-xs text-muted-foreground">
                      <FileText className="w-3 h-3" />
                      Source:{" "}
                      <Link
                        href={`/app/sources/${r.source.sourceId}`}
                        className="min-w-0 break-words hover:underline"
                      >
                        {r.source.filename}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-sm font-semibold mb-3 border-b border-border pb-2">
              Evidence Provenance
            </h3>
            <ul className="space-y-2 bg-card border border-border rounded-lg divide-y divide-border">
              {data.sources.map((s) => (
                <li
                  key={s.sourceId}
                  className="group flex flex-col items-start gap-2 p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <Link
                    href={`/app/sources/${s.sourceId}`}
                    className="flex min-w-0 items-center gap-2 font-medium transition-colors hover:text-primary sm:max-w-[70%]"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="break-words">{s.filename}</span>
                  </Link>
                  <span className="text-xs text-muted-foreground shrink-0 font-mono">
                    {new Date(s.uploadedAt).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
