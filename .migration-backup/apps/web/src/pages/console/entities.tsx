import { listEntities } from "@/lib/api";
import { useData, ErrorState, EmptyState, RowsSkeleton } from "./shared";
import { Database } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Entities({ embedded = false }: { embedded?: boolean }) {
  const { data, loading, error } = useData(listEntities);

  if (loading) return <RowsSkeleton />;
  if (error) return <ErrorState error={error} />;

  const entities = data?.entities || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Entities
          </h1>
          <p className="text-muted-foreground text-sm">
            De-duplicated organizational entities mapped from evidence.
          </p>
        </div>
      )}

      {entities.length === 0 ? (
        <EmptyState
          icon={Database}
          title="No entities have been resolved yet"
          description="Entities will appear when Orgni receives evidence from connected systems, uploaded sources or the Events API."
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link href="/app/connections">Connect a source</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href="/app/developer">View API setup</Link>
              </Button>
            </div>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <table className="hidden w-full text-sm sm:table">
            <thead className="bg-muted/30">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-1/2">
                  Entity
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                  Type / Key
                </th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">
                  Occurrences
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entities.map((e) => (
                <tr key={e.key} className="hover:bg-muted/10 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/app/entities/${encodeURIComponent(e.key)}`}
                      className="font-medium hover:text-primary transition-colors block"
                    >
                      {e.entity.name ? String(e.entity.name) : e.key}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {e.entity.type ? String(e.entity.type) : "entity"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center justify-center bg-muted px-2 py-0.5 rounded-full text-xs font-mono">
                      {e.occurrences}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="divide-y divide-border sm:hidden">
            {entities.map((entity) => (
              <Link
                key={entity.key}
                href={`/app/entities/${encodeURIComponent(entity.key)}`}
                className="block px-4 py-4 transition-colors hover:bg-muted/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold">
                      {entity.entity.name
                        ? String(entity.entity.name)
                        : entity.key}
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-muted-foreground">
                      {entity.entity.type
                        ? String(entity.entity.type)
                        : "entity"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-1 text-xs">
                    {entity.occurrences}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
