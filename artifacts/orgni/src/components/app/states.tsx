/**
 * Loading / empty / error / success primitives for the Orgni product screens.
 * Deliberately quiet — thin borders, generous spacing, no heavy iconography.
 */
import type { ReactNode } from "react";
import { AlertCircle, Check, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 px-8 py-16 text-center">
      <h3 className="text-lg font-medium tracking-tight">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-4 text-sm">
      <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-foreground">
          {message ?? "Something went wrong loading this."}
        </p>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className="size-3" />
            Try again
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function SuccessNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
        <Check className="size-3" strokeWidth={3} />
      </span>
      <span>{children}</span>
    </div>
  );
}

/** A subtle inline banner noting that figures are demo data, not live. */
export function DemoDataNote({ children }: { children?: ReactNode }) {
  return (
    <p className="text-xs text-muted-foreground">
      {children ??
        "Showing example data. Connect your systems and add files to see your organisation."}
    </p>
  );
}
