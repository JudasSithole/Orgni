/**
 * Notification bell in the header — surfaces things that need the admin's
 * attention: approvals waiting, and setup that isn't finished.
 */
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useOrgni } from "@/lib/orgni/service";
import { relativeTime } from "@/lib/orgni/format";

export function NotificationBell() {
  const { state } = useOrgni();
  const [, navigate] = useLocation();

  const approvals = state.activity.filter((a) => a.status === "awaiting_approval");

  const setup: { label: string; href: string }[] = [];
  if (!state.connections.some((c) => c.key === "microsoft-365" && c.status === "connected"))
    setup.push({ label: "Connect Microsoft 365", href: "/app/settings/connections" });
  if (state.teams.state !== "installed")
    setup.push({ label: "Add Orgni to Teams", href: "/app/settings/teams" });

  const count = approvals.length + setup.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label={`Notifications${count ? ` (${count})` : ""}`}
        >
          <Bell className="size-[18px]" strokeWidth={1.75} />
          {count > 0 ? (
            <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold leading-4 text-primary-foreground">
              {count > 9 ? "9+" : count}
            </span>
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Needs your attention</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {count === 0 ? (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            You're all caught up.
          </div>
        ) : (
          <>
            {approvals.map((a) => (
              <DropdownMenuItem
                key={a.id}
                className="flex-col items-start gap-0.5"
                onClick={() => navigate("/app/settings/activity")}
              >
                <span className="text-sm">{a.title}</span>
                <span className="text-xs text-muted-foreground">
                  Waiting for approval · {relativeTime(a.at)}
                </span>
              </DropdownMenuItem>
            ))}
            {setup.map((s) => (
              <DropdownMenuItem key={s.href} onClick={() => navigate(s.href)}>
                <span className="text-sm">{s.label}</span>
              </DropdownMenuItem>
            ))}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
