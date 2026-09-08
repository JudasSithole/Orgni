import { getOverview } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { ConsolePageHeader, ErrorState, useData } from "./shared";

export default function Overview() {
  const { data, loading, error } = useData(getOverview);
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (error) return <ErrorState error={error} />;
  if (!data) return null;

  const failed = data.sources.byState.FAILED ?? 0;
  const healthy = failed === 0;
  const latest = data.latestSources[0];
  const metrics = [
    ["Orgni status", healthy ? "Healthy" : "Attention required", "/app"],
    ["Connected sources", String(data.sources.total), "/app/connections"],
    [
      "Last context update",
      latest ? new Date(latest.uploadedAt).toLocaleString() : "No context yet",
      "/app/connections",
    ],
    [
      "Unresolved conflicts",
      String(data.exceptions),
      "/app/data-quality/issues",
    ],
    ["Failed ingestion events", String(failed), "/app/data-quality/issues"],
    ["Active consumers", "0", "/app/developer/consumers"],
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ConsolePageHeader
        title="Infrastructure Home"
        description="A concise view of whether organisational context is flowing and where technical attention is required."
      />
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <div className="text-sm font-medium">Orgni infrastructure</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Context ingestion and model API
          </p>
        </div>
        <Badge variant={healthy ? "default" : "destructive"}>
          {healthy ? "Healthy" : "Attention required"}
        </Badge>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {metrics.map(([title, value, href]) => (
          <Link key={title} href={href}>
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs uppercase text-muted-foreground">
                  {title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="break-words text-xl font-semibold leading-tight">
                  {value}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <div className="rounded-lg border border-border p-5">
        <h2 className="text-sm font-semibold">Current capability</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This environment currently processes uploaded invoices, proofs of
          payment and contracts into structured, traceable organisational facts.
          Additional source connectors and consumer registration are not yet
          configured.
        </p>
      </div>
    </div>
  );
}
