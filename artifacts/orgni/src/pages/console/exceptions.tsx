import { getExceptions } from "@/lib/api";
import { useData, ErrorState, EmptyState, DefensiveDisplay } from "./shared";
import {
  AlertTriangle,
  FileText,
  XCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { Link } from "wouter";

export default function Exceptions({
  embedded = false,
}: {
  embedded?: boolean;
}) {
  const { data, loading, error } = useData(getExceptions);

  if (loading)
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 bg-muted/50 rounded-lg w-1/4" />
        <div className="h-[300px] bg-muted/50 rounded-lg" />
      </div>
    );
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const hasExceptions =
    data.conflicts.length > 0 ||
    data.rejected.length > 0 ||
    data.warnings.length > 0 ||
    data.failedSources.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {!embedded && (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight mb-2">
            Exceptions
          </h1>
          <p className="text-muted-foreground text-sm">
            Conflicts, refused assertions, and failed sources.
          </p>
        </div>
      )}

      {!hasExceptions ? (
        <EmptyState
          icon={AlertTriangle}
          title="No exceptions"
          description="The organizational model is clean. Contradictions between sources, processing failures, and refused assertions will appear here."
        />
      ) : (
        <div className="space-y-10">
          {data.failedSources.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-destructive border-b border-border pb-2">
                <XCircle className="w-4 h-4" /> Failed Sources
              </h2>
              <div className="space-y-3">
                {data.failedSources.map((s) => (
                  <div
                    key={s.sourceId}
                    className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg"
                  >
                    <div className="mb-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <Link
                        href={`/app/sources/${s.sourceId}`}
                        className="font-medium text-destructive hover:underline"
                      >
                        {s.filename}
                      </Link>
                      <span className="text-xs text-muted-foreground font-mono">
                        {new Date(s.uploadedAt).toLocaleString()}
                      </span>
                    </div>
                    <ul className="text-sm text-destructive/80 space-y-1 list-disc list-inside">
                      {s.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.conflicts.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 text-foreground border-b border-border pb-2">
                <AlertTriangle className="w-4 h-4" /> Fact Conflicts
              </h2>
              <div className="grid md:grid-cols-2 gap-4">
                {data.conflicts.map((c, i) => (
                  <div
                    key={i}
                    className="p-4 border border-border rounded-lg bg-card"
                  >
                    <DefensiveDisplay
                      data={c.conflict as Record<string, unknown>}
                    />
                    <div className="mt-3 text-xs text-muted-foreground flex items-center gap-1.5 pt-3 border-t border-border/50">
                      <FileText className="w-3 h-3 shrink-0" />
                      Source:{" "}
                      <Link
                        href={`/app/sources/${c.source.sourceId}`}
                        className="hover:underline truncate"
                      >
                        {c.source.filename}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.rejected.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 border-b border-border pb-2">
                <AlertCircle className="w-4 h-4 text-muted-foreground" />{" "}
                Rejected Assertions
              </h2>
              <div className="space-y-3">
                {data.rejected.map((r, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                  >
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {r.reason}
                    </p>
                    <Link
                      href={`/app/sources/${r.source.sourceId}`}
                      className="mt-1 flex min-w-0 items-center gap-1 text-xs text-muted-foreground hover:underline sm:shrink-0"
                    >
                      <FileText className="w-3 h-3" />{" "}
                      <span className="truncate max-w-[150px]">
                        {r.source.filename}
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.warnings.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold mb-4 flex items-center gap-2 border-b border-border pb-2">
                <Info className="w-4 h-4 text-muted-foreground" /> Warnings
              </h2>
              <div className="space-y-2 bg-card border border-border rounded-lg p-1">
                {data.warnings.map((w, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-start gap-2 border-b border-border/50 p-3 text-sm last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <span className="text-muted-foreground">{w.warning}</span>
                    <Link
                      href={`/app/sources/${w.source.sourceId}`}
                      className="flex min-w-0 items-center gap-1 text-xs hover:underline sm:ml-4 sm:shrink-0"
                    >
                      <FileText className="w-3 h-3" />{" "}
                      <span className="truncate max-w-[150px]">
                        {w.source.filename}
                      </span>
                    </Link>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
