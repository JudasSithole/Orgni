/**
 * Overview — what the person running Orgni for their organisation wants to see
 * first: is it working, is the team using it, and does anything need me.
 */
import { useEffect, useMemo } from "react";
import { Link } from "wouter";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOrgni } from "@/lib/orgni/service";
import { PageHeader, Panel } from "@/components/app/primitives";
import { PageSkeleton, DemoDataNote } from "@/components/app/states";
import { relativeTime, clockTime } from "@/lib/orgni/format";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export default function Overview() {
  const { state, loading, usingDemoData, refresh } = useOrgni();

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (loading && !state.organisation) return <PageSkeleton />;

  const orgName = state.organisation?.name ?? "your organisation";
  const msConnected = state.connections.some(
    (c) => c.key === "microsoft-365" && c.status === "connected",
  );
  const teamsActive = state.teams.state === "installed";
  const running = msConnected && teamsActive;

  const pending = state.activity.filter((a) => a.status === "awaiting_approval");
  const recent = state.activity.filter((a) => a.status !== "awaiting_approval");

  const week = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 3600_000;
    const rows = state.activity.filter((a) => new Date(a.at).getTime() > cutoff);
    const people = new Set(
      rows.map((a) => a.requestedBy).filter((x): x is string => !!x),
    );
    return {
      handled: rows.filter((a) => a.status === "completed").length,
      waiting: rows.filter((a) => a.status === "awaiting_approval").length,
      people: people.size,
    };
  }, [state.activity]);

  const notReady: string | null = !msConnected
    ? "Microsoft 365 isn't connected yet."
    : !teamsActive
      ? "Orgni isn't in Teams yet."
      : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <PageHeader title={`${greeting()}, ${orgName}`} />

      {/* Health */}
      <Panel className="flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="flex items-center gap-2 text-base font-medium">
            <span
              className={`size-2.5 rounded-full ${running ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            {running ? "Orgni is running" : "Orgni needs setup"}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {running ? (
              "Working across Microsoft 365 and Teams."
            ) : (
              <Link
                href={msConnected ? "/app/settings/teams" : "/app/settings/connections"}
                className="font-medium text-foreground hover:underline"
              >
                {notReady} Finish setup →
              </Link>
            )}
          </p>
        </div>
        <Button asChild variant="secondary">
          <a href="https://teams.microsoft.com" target="_blank" rel="noreferrer">
            Open Orgni in Teams
            <ArrowUpRight className="size-4" />
          </a>
        </Button>
      </Panel>

      {/* Value this week */}
      <section>
        <h2 className="mb-3 text-sm font-medium">This week</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            ["Requests handled", week.handled],
            ["Waiting for you", week.waiting],
            ["People using Orgni", week.people],
          ].map(([label, n]) => (
            <div key={label as string} className="rounded-xl border border-border bg-card px-4 py-3.5">
              <div className="text-2xl font-medium tabular-nums">{n as number}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {pending.length > 0 ? (
        <section className="space-y-2">
          <h2 className="text-sm font-medium">Waiting for you</h2>
          {pending.map((a) => (
            <Link
              key={a.id}
              href="/app/settings/activity"
              className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3 text-sm hover:border-amber-500/50"
            >
              <span>{a.title}</span>
              <span className="text-xs font-medium text-muted-foreground">Review →</span>
            </Link>
          ))}
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium">Recent activity</h2>
          <Link
            href="/app/settings/activity"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
            Nothing yet. When your team gives Orgni work in Teams, it appears here.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {recent.slice(0, 7).map((a) => (
              <li key={a.id}>
                <Link
                  href="/app/settings/activity"
                  className="flex items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-accent/50"
                >
                  <span className="flex min-w-0 items-baseline gap-2.5">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">
                      {clockTime(a.at)}
                    </span>
                    <span className="truncate">{a.title}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {a.requestedBy ?? "Auto"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {usingDemoData ? <DemoDataNote /> : null}
      </section>
    </div>
  );
}
