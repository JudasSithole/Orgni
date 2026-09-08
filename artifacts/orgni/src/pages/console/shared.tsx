import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { LucideIcon } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";

/** Stacked card placeholders — for FactCard lists (facts, relationships, policies). */
export function CardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
          <div className="mt-3 space-y-2">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Table-row placeholders — for entity / source tables. */
export function RowsSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function useData<T>(
  fetcher: (token: string, arg?: any) => Promise<T>,
  arg?: any,
) {
  const { session } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const execute = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcherRef.current(session.token, arg);
      setData(result);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [session, arg]);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
}

export function ErrorState({ error }: { error: any }) {
  return (
    <div className="p-4 border border-destructive/20 bg-destructive/10 text-destructive rounded-md text-sm">
      {error?.message || "An error occurred while fetching data."}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-lg bg-card/50">
      <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4 text-muted-foreground">
        <Icon className="h-6 w-6" strokeWidth={1.5} />
      </div>
      <h3 className="text-base font-semibold mb-2 tracking-tight">{title}</h3>
      <div className="text-sm text-muted-foreground max-w-[400px] mb-6 leading-relaxed">
        {description}
      </div>
      {action}
    </div>
  );
}

export function DefensiveDisplay({
  data,
}: {
  data: Record<string, unknown> | null | undefined;
}) {
  if (!data)
    return <span className="text-muted-foreground text-xs italic">Empty</span>;
  if (data.name) return <span>{String(data.name)}</span>;
  if (data.type) return <span>{String(data.type)}</span>;

  const entries = Object.entries(data).filter(
    ([_, v]) => v !== null && v !== undefined,
  );
  if (entries.length === 0)
    return <span className="text-muted-foreground text-xs italic">Empty</span>;

  return (
    <div className="flex flex-col gap-1 text-xs">
      {entries.map(([k, v]) => (
        <div key={k} className="flex gap-2">
          <span className="text-muted-foreground shrink-0">{k}:</span>
          <span className="font-mono break-all">
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function SectionTabs({
  tabs,
}: {
  tabs: { label: string; href: string; disabled?: boolean }[];
}) {
  const [location] = useLocation();
  return (
    <nav
      aria-label="Section views"
      className="-mx-4 flex flex-wrap border-b border-border px-4 sm:mx-0 sm:px-0"
    >
      {tabs.map((tab) =>
        tab.disabled ? (
          <span
            key={tab.href}
            aria-disabled="true"
            title="Not available yet"
            className="shrink-0 cursor-not-allowed border-b-2 border-transparent px-3 py-3 text-sm font-medium text-muted-foreground/45 sm:px-4"
          >
            {tab.label}
          </span>
        ) : (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition-colors sm:px-4 ${
              location === tab.href
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ),
      )}
    </nav>
  );
}

export function ConsolePageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
