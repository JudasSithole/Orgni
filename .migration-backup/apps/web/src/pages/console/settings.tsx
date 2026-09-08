import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "wouter";
import {
  Building2,
  Check,
  Copy,
  LogOut,
  MoreHorizontal,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";

type SettingsView = "workspace" | "members";

function Initials({ value }: { value: string }) {
  const initials = value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-sm font-semibold text-primary">
      {initials || "OR"}
    </span>
  );
}

export default function Settings() {
  const { session, logout } = useAuth();
  const [, navigate] = useLocation();
  const [view, setView] = useState<SettingsView>("workspace");
  const [copied, setCopied] = useState(false);

  if (!session) return null;

  async function copyTenantId() {
    await navigator.clipboard.writeText(session!.tenantId);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  const role = session.roles?.[0] ?? "Owner";

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage this workspace and the people who can access it.
          </p>
        </div>
        <Button
          variant="outline"
          disabled
          title="Member invitations are not available yet"
        >
          <UserPlus />
          Invite member
        </Button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[210px_minmax(0,1fr)]">
        <nav aria-label="Settings sections" className="space-y-1">
          <button
            type="button"
            onClick={() => setView("workspace")}
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
              view === "workspace"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <Building2 className="size-4" />
            Workspace
          </button>
          <button
            type="button"
            onClick={() => setView("members")}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
              view === "members"
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
            }`}
          >
            <span className="flex items-center gap-3">
              <Users className="size-4" />
              Members
            </span>
            <span className="text-xs text-muted-foreground">1</span>
          </button>
        </nav>

        <div className="min-w-0">
          {view === "workspace" ? (
            <div className="space-y-8">
              <section aria-labelledby="workspace-title">
                <div className="mb-4">
                  <h2 id="workspace-title" className="text-lg font-semibold">
                    Workspace
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Identity and access boundary for your Orgni context.
                  </p>
                </div>

                <div className="overflow-hidden rounded-md border border-border bg-card">
                  <div className="flex items-center gap-4 border-b border-border p-5">
                    <Initials value={session.organization} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {session.organization}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Orgni workspace
                      </p>
                    </div>
                    <Badge variant="secondary">Active</Badge>
                  </div>

                  <dl className="divide-y divide-border">
                    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                      <dt className="text-sm text-muted-foreground">
                        Workspace name
                      </dt>
                      <dd className="text-sm font-medium">
                        {session.organization}
                      </dd>
                    </div>
                    <div className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                      <dt className="text-sm text-muted-foreground">
                        Workspace ID
                      </dt>
                      <dd className="flex min-w-0 items-center gap-2">
                        <code className="truncate text-xs">
                          {session.tenantId}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={copyTenantId}
                          title="Copy workspace ID"
                          aria-label="Copy workspace ID"
                        >
                          {copied ? <Check /> : <Copy />}
                        </Button>
                      </dd>
                    </div>
                    <div className="grid gap-1 px-5 py-4 sm:grid-cols-[180px_minmax(0,1fr)] sm:items-center">
                      <dt className="text-sm text-muted-foreground">
                        Your role
                      </dt>
                      <dd className="flex items-center gap-2 text-sm font-medium">
                        <ShieldCheck className="size-4 text-foreground" />
                        {role}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section aria-labelledby="workspace-members-title">
                <div className="mb-4 flex items-end justify-between">
                  <div>
                    <h2
                      id="workspace-members-title"
                      className="text-lg font-semibold"
                    >
                      Members
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      People with access to this workspace.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView("members")}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    View members
                  </button>
                </div>

                <div className="grid overflow-hidden rounded-md border border-border bg-card sm:grid-cols-2">
                  <div className="border-b border-border p-5 sm:border-r sm:border-b-0">
                    <p className="text-2xl font-semibold">1</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Total members
                    </p>
                  </div>
                  <div className="p-5">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-neutral-700" />
                      <p className="text-2xl font-semibold">1</p>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Active now
                    </p>
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <section aria-labelledby="members-title">
              <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 id="members-title" className="text-lg font-semibold">
                    Members
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    One active member currently has access.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full bg-neutral-700" />1
                  active now
                </div>
              </div>

              <div className="overflow-hidden rounded-md border border-border bg-card">
                <div className="hidden grid-cols-[minmax(0,1fr)_140px_120px_40px] border-b border-border bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground sm:grid">
                  <span>Member</span>
                  <span>Role</span>
                  <span>Status</span>
                  <span />
                </div>
                <div className="grid grid-cols-[minmax(0,1fr)_40px] items-center gap-3 px-4 py-4 sm:grid-cols-[minmax(0,1fr)_140px_120px_40px]">
                  <div className="flex min-w-0 items-center gap-3">
                    <Initials value={session.email} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {session.email}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        You
                      </p>
                    </div>
                  </div>
                  <div className="hidden text-sm sm:block">{role}</div>
                  <div className="hidden items-center gap-2 text-xs text-foreground sm:flex">
                    <span className="size-2 rounded-full bg-neutral-700" />
                    Active
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled
                    className="ml-auto"
                    aria-label="Member actions unavailable"
                  >
                    <MoreHorizontal />
                  </Button>
                </div>
              </div>

              <div className="mt-4 rounded-md border border-dashed border-border px-5 py-4">
                <p className="text-sm font-medium">
                  Member invitations are coming next
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Invitations, role changes and member removal require the
                  production identity and membership service.
                </p>
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="border-t border-border pt-6">
        <Button
          variant="outline"
          onClick={() => {
            logout();
            navigate("/");
          }}
        >
          <LogOut />
          Sign out
        </Button>
      </div>
    </div>
  );
}
