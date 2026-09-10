/**
 * Settings — a focused modal with a blurred backdrop and its own tabs.
 *
 * The admin surfaces that don't belong in day-to-day use live here:
 * Organisation, Account, Connections, Permissions, Activity, Teams app and
 * Intelligence. Opened by any `/app/settings*` route (and the aliases
 * `/app/connections`, `/app/permissions`, `/app/activity`).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  Loader2,
  Plug,
  ScrollText,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { fileToAvatarDataUrl } from "@/lib/orgni/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useOrgni } from "@/lib/orgni/service";
import { CONNECTION_CATALOG } from "@/lib/orgni/defaults";
import { fullDateTime, clockTime } from "@/lib/orgni/format";
import { ApprovalLevelSelect, ToggleRow, levelText } from "@/components/app/controls";
import { ConnectionLogo, ServiceLogo } from "@/components/app/brand-icons";
import { TeamsAppSection } from "@/components/app/teams-app-section";
import type { AudienceScope, ActivityStatus } from "@/lib/orgni/types";

const TABS = [
  { key: "account", label: "Account", icon: UserRound },
  { key: "organisation", label: "Organisation", icon: Building2 },
  { key: "members", label: "Members", icon: Users },
  { key: "connections", label: "Plugins", icon: Plug },
  { key: "permissions", label: "Permissions", icon: ShieldCheck },
  { key: "activity", label: "Activity", icon: ScrollText },
  { key: "teams", label: "Teams app", icon: Check },
  { key: "intelligence", label: "Intelligence", icon: Sparkles },
] as const;

type TabKey = (typeof TABS)[number]["key"];

/** Which settings tab (if any) the current path maps to. */
export function settingsTabFromPath(path: string): TabKey | null {
  if (path.startsWith("/app/settings/")) {
    const t = path.slice("/app/settings/".length).split("/")[0];
    if (t === "plugins") return "connections";
    return (TABS.find((x) => x.key === t)?.key ?? "account") as TabKey;
  }
  if (path === "/app/settings") return "account";
  if (path.startsWith("/app/connections")) return "connections";
  if (path.startsWith("/app/permissions")) return "permissions";
  if (path.startsWith("/app/activity")) return "activity";
  return null;
}

export function SettingsModal({ tab }: { tab: TabKey }) {
  const [, navigate] = useLocation();
  const [active, setActive] = useState<TabKey>(tab);

  useEffect(() => setActive(tab), [tab]);

  const close = () => navigate("/app");

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-background/60 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 flex h-[86vh] w-[min(940px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <DialogPrimitive.Title className="text-sm font-semibold">
              Settings
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              className="rounded-md p-1 text-muted-foreground hover:bg-accent"
              aria-label="Close settings"
            >
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex min-h-0 flex-1">
            {/* tab rail */}
            <nav className="hidden w-52 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-border p-3 sm:flex">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setActive(t.key);
                    navigate(`/app/settings/${t.key}`, { replace: true });
                  }}
                  className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active === t.key
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                  }`}
                >
                  <t.icon className="size-4" strokeWidth={1.75} />
                  {t.label}
                </button>
              ))}
            </nav>

            {/* mobile tab strip */}
            <div className="flex w-full flex-col min-h-0">
              <div className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 sm:hidden">
                {TABS.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setActive(t.key);
                      navigate(`/app/settings/${t.key}`, { replace: true });
                    }}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${
                      active === t.key
                        ? "bg-foreground text-background"
                        : "text-muted-foreground"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-8">
                {active === "organisation" && <OrganisationTab />}
                {active === "account" && <AccountTab />}
                {active === "members" && <MembersTab />}
                {active === "connections" && <ConnectionsTab />}
                {active === "permissions" && <PermissionsTab />}
                {active === "activity" && <ActivityTab />}
                {active === "teams" && <TeamsAppSection />}
                {active === "intelligence" && <IntelligenceTab />}
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/* ---- tabs ------------------------------------------------------- */

function TabHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-medium tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function OrganisationTab() {
  const { state, resetWorkspace } = useOrgni();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const org = state.organisation;
  return (
    <div>
      <TabHeader title="Organisation" description="The basics Orgni holds about your organisation." />
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        <Field label="Name" value={org?.name ?? "—"} />
        <Field label="Work email" value={org?.workEmail ?? "—"} />
        <Field label="Website" value={org?.website || "—"} />
        <Field label="Created" value={org?.createdAt ? fullDateTime(org.createdAt) : "—"} />
      </div>
      <div className="mt-8">
        <h3 className="text-sm font-medium">Reset workspace</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Clears the organisation, connections and settings and starts onboarding again.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="mt-3">Reset workspace</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset this workspace?</AlertDialogTitle>
              <AlertDialogDescription>
                This clears everything and restarts onboarding.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  resetWorkspace();
                  toast({ title: "Workspace reset" });
                  navigate("/app");
                }}
              >
                Reset
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

function AccountTab() {
  const { session, logout } = useAuth();
  const { state, updateMember } = useOrgni();
  const { toast } = useToast();
  const email = session?.email ?? "";
  const me = state.members.find((m) => m.email === email.toLowerCase());

  const [name, setName] = useState(me?.name ?? "");
  const [avatar, setAvatar] = useState<string | null>(me?.avatar ?? null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(me?.name ?? "");
    setAvatar(me?.avatar ?? null);
  }, [me?.name, me?.avatar]);

  const dirty = (me?.name ?? "") !== name || (me?.avatar ?? null) !== avatar;

  async function pickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!file) return;
    try {
      setAvatar(await fileToAvatarDataUrl(file));
    } catch {
      toast({ title: "Could not read that image" });
    }
  }

  async function save() {
    if (!email) return;
    setSaving(true);
    try {
      await updateMember(email, { name: name.trim(), avatar });
      toast({ title: "Profile updated" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <TabHeader title="Account" description="Your profile in this Orgni workspace." />

      <div className="flex items-center gap-4">
        <AvatarBubble name={name || email} avatar={avatar} size={64} />
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={pickAvatar}
          />
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
            Upload photo
          </Button>
          {avatar ? (
            <Button size="sm" variant="ghost" onClick={() => setAvatar(null)}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="acct-name">Name</Label>
          <Input
            id="acct-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
        </div>
        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">
          <Field label="Email" value={email || "—"} />
          <Field label="Role" value={me?.role ?? session?.roles?.[0] ?? "Owner"} />
          <Field label="Workspace" value={session?.organization ?? "—"} />
        </div>
      </div>

      <div className="mt-6 flex gap-2">
        <Button size="sm" onClick={save} disabled={!dirty || saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          Save changes
        </Button>
        <Button size="sm" variant="outline" onClick={() => logout()}>
          Sign out
        </Button>
      </div>
    </div>
  );
}

export function AvatarBubble({
  name,
  avatar,
  size = 32,
}: {
  name: string;
  avatar?: string | null;
  size?: number;
}) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground"
      style={{ width: size, height: size }}
    >
      <UserRound style={{ width: size * 0.5, height: size * 0.5 }} strokeWidth={1.75} />
    </span>
  );
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

function MembersTab() {
  const { state, addMember, removeMember, updateMember } = useOrgni();
  const { session } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const myEmail = session?.email?.toLowerCase();
  const iAmOwnerAdmin =
    !state.members.length ||
    ["owner", "admin"].includes(
      state.members.find((m) => m.email === myEmail)?.role ?? "owner",
    );

  async function add() {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) {
      toast({ title: "Enter a valid work email" });
      return;
    }
    setBusy(true);
    try {
      await addMember(e);
      setEmail("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <TabHeader
        title="Members"
        description="Add your team by work email. They can use Orgni in Teams and sign in here with that email."
      />

      {iAmOwnerAdmin ? (
        <form
          className="flex gap-2"
          onSubmit={(ev) => {
            ev.preventDefault();
            add();
          }}
        >
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
          />
          <Button type="submit" disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Add
          </Button>
        </form>
      ) : null}

      <ul className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
        {state.members.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            No one added yet.
          </li>
        ) : (
          state.members.map((m) => (
            <li key={m.email} className="flex items-center gap-3 px-4 py-3">
              <AvatarBubble name={m.name || m.email} avatar={m.avatar} size={32} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">
                  {m.name || m.email}
                  {m.email === myEmail ? (
                    <span className="ml-1.5 text-xs text-muted-foreground">(you)</span>
                  ) : null}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {m.name ? m.email : ""}
                  {m.status === "invited" ? " · invited" : ""}
                </div>
              </div>
              {iAmOwnerAdmin && m.email !== myEmail ? (
                <select
                  value={m.role}
                  onChange={(e) =>
                    updateMember(m.email, {
                      role: e.target.value as "owner" | "admin" | "member",
                    })
                  }
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  {Object.entries(ROLE_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-muted-foreground">
                  {ROLE_LABEL[m.role]}
                </span>
              )}
              {iAmOwnerAdmin && m.email !== myEmail ? (
                <button
                  type="button"
                  onClick={() => removeMember(m.email)}
                  className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label={`Remove ${m.email}`}
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
            </li>
          ))
        )}
      </ul>

      <p className="mt-4 text-xs text-muted-foreground">
        Adding someone here whitelists their work email for this workspace. Real
        Teams provisioning happens once the Teams app is registered.
      </p>
    </div>
  );
}

function ConnectionsTab() {
  const { state, connect, disconnect } = useOrgni();
  const [pending, setPending] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const connectedKeys = new Set(
    state.connections.filter((c) => c.status === "connected").map((c) => c.key),
  );

  if (selected) {
    const catalog = CONNECTION_CATALOG.find((c) => c.key === selected)!;
    const live = state.connections.find((c) => c.key === selected);
    const connected = live?.status === "connected";
    return (
      <div>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Connections
        </button>
        <div className="flex items-start gap-3">
          <ConnectionLogo connectionKey={catalog.key} size={36} />
          <div>
            <h2 className="text-lg font-medium tracking-tight">{catalog.name}</h2>
            <p className="text-sm text-muted-foreground">{catalog.description}</p>
          </div>
        </div>
        {connected && live?.mode === "mock" ? (
          <p className="mt-4 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
            Demo connection — set up here, not syncing from a live {catalog.name} tenant yet.
          </p>
        ) : null}
        <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {catalog.services.map((s) => (
            <div key={s.label} className="flex items-start gap-3 px-4 py-3 text-sm">
              <span className="mt-0.5"><ServiceLogo label={s.label} /></span>
              <div>
                <div className="font-medium">{s.label}</div>
                <p className="text-muted-foreground">{s.access}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5">
          {connected ? (
            <Button variant="outline" size="sm" onClick={() => { disconnect(live!.id); setSelected(null); }}>
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={async () => {
                setPending(catalog.key);
                await connect(catalog.key);
                setPending(null);
              }}
              disabled={pending === catalog.key}
            >
              {pending === catalog.key ? <Loader2 className="size-4 animate-spin" /> : null}
              Connect {catalog.name}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <TabHeader title="Connections" description="Connect the systems Orgni can understand and work with." />
      <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
        {CONNECTION_CATALOG.map((entry) => {
          const connected = connectedKeys.has(entry.key);
          return (
            <li key={entry.key}>
              <button
                type="button"
                onClick={() => setSelected(entry.key)}
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-accent/50"
              >
                <ConnectionLogo connectionKey={entry.key} size={26} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {entry.name}
                    {connected ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs">
                        <Check className="size-3" strokeWidth={3} /> Connected
                      </span>
                    ) : null}
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{entry.description}</p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs text-muted-foreground">
        Connections run as guided demo integrations for now. Nothing syncs from a real system until that integration is wired up end to end.
      </p>
    </div>
  );
}

const AUDIENCE_OPTIONS: { value: AudienceScope; label: string }[] = [
  { value: "all_employees", label: "All employees" },
  { value: "specific_departments", label: "Specific departments" },
  { value: "specific_teams", label: "Specific Teams" },
  { value: "specific_users", label: "Specific users" },
];

function PermissionsTab() {
  const { state, setPermissionLevel, setApproval, setCapability, setAudience } = useOrgni();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const info = state.permissions.access.filter((a) => a.kind === "info");
  const actions = state.permissions.access.filter((a) => a.kind === "action");

  return (
    <div className="space-y-8">
      <TabHeader title="What Orgni can see and do" description="Simple settings first. Open advanced controls only if you need them." />
      <PermSection title="Information access">
        {info.map((row) => (
          <PermRow key={row.key} label={row.label} level={row.level} onChange={(l) => setPermissionLevel(row.key, l)} />
        ))}
      </PermSection>
      <PermSection title="Actions">
        {actions.map((row) => (
          <PermRow key={row.key} label={row.label} level={row.level} onChange={(l) => setPermissionLevel(row.key, l)} />
        ))}
      </PermSection>
      <PermSection title="Approvals">
        {state.approvals.map((a) => (
          <PermRow key={a.key} label={a.label} sub={levelText(a.level)} level={a.level} onChange={(l) => setApproval(a.key, l)} />
        ))}
      </PermSection>
      <div>
        <h3 className="mb-3 text-sm font-medium">Who can use Orgni?</h3>
        <div className="flex flex-wrap gap-2">
          {AUDIENCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setAudience(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                state.permissions.audience === opt.value
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {showAdvanced ? "Hide" : "Show"} advanced capability controls
        </button>
        {showAdvanced ? (
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
            {state.capabilities.map((c) => (
              <ToggleRow
                key={c.key}
                label={c.label}
                description={c.description}
                checked={c.enabled}
                onCheckedChange={(v) => setCapability(c.key, v)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PermSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border">{children}</div>
    </section>
  );
}
function PermRow({
  label,
  sub,
  level,
  onChange,
}: {
  label: string;
  sub?: string;
  level: "none" | "ask_first" | "always";
  onChange: (l: "none" | "ask_first" | "always") => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
      </div>
      <ApprovalLevelSelect value={level} onChange={onChange} compact />
    </div>
  );
}

const STATUS_TEXT: Record<ActivityStatus, string> = {
  completed: "Completed",
  awaiting_approval: "Waiting for approval",
  rejected: "Rejected",
  in_progress: "In progress",
};

function ActivityTab() {
  const { state, resolveApproval, refresh } = useOrgni();
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    refresh();
  }, [refresh]);

  if (selected) {
    const a = state.activity.find((x) => x.id === selected);
    if (!a) {
      return (
        <div>
          <BackToActivity onBack={() => setSelected(null)} />
          <p className="text-sm text-muted-foreground">This activity no longer exists.</p>
        </div>
      );
    }
    const pending = a.status === "awaiting_approval" && a.approval;
    return (
      <div>
        <BackToActivity onBack={() => setSelected(null)} />
        <div className="font-mono text-xs text-muted-foreground">{fullDateTime(a.at)}</div>
        <h2 className="mt-1 text-lg font-medium tracking-tight">{a.title}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {STATUS_TEXT[a.status]}
          {a.requestedBy ? ` · Requested by ${a.requestedBy}` : ""}
        </p>

        {pending ? (
          <div className="mt-5 rounded-xl border border-border bg-card p-4">
            <div className="text-sm font-medium">
              {a.approval!.kind === "email"
                ? "Orgni wants to send an email."
                : a.approval!.kind === "financial"
                  ? "Orgni wants to perform a financial action."
                  : "Orgni wants to update a business record."}
            </div>
            <dl className="mt-3 divide-y divide-border border-y border-border">
              {a.approval!.fields.map((f) => (
                <div key={f.label} className="flex gap-4 py-2 text-sm">
                  <dt className="w-24 shrink-0 text-muted-foreground">{f.label}</dt>
                  <dd className="min-w-0">{f.value}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-4 flex gap-2">
              <Button size="sm" onClick={() => resolveApproval(a.id, true)}>Approve</Button>
              <Button size="sm" variant="outline" onClick={() => resolveApproval(a.id, false)}>Reject</Button>
            </div>
          </div>
        ) : null}

        <div className="mt-5 divide-y divide-border overflow-hidden rounded-xl border border-border text-sm">
          <DetailRow title="What Orgni understood">{a.understood}</DetailRow>
          <DetailRow title="Information used">
            {a.sourcesUsed.length ? a.sourcesUsed.join(" · ") : "—"}
          </DetailRow>
          <DetailRow title="What Orgni did">
            {a.actionsPerformed.length ? a.actionsPerformed.join(" · ") : "—"}
          </DetailRow>
          <DetailRow title="Why Orgni did this">{a.reason || "—"}</DetailRow>
          <DetailRow title="Result">{a.result || "—"}</DetailRow>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TabHeader title="Activity" description="Everything Orgni has done, and anything waiting for your approval." />
      {state.activity.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
          Nothing yet. Work your team gives Orgni in Teams will appear here.
        </p>
      ) : (
        <ul className="space-y-2">
          {state.activity.map((a) => (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setSelected(a.id)}
                className="flex w-full items-start justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm hover:border-foreground/30"
              >
                <div className="min-w-0">
                  <div className="font-mono text-xs text-muted-foreground">{clockTime(a.at)}</div>
                  <div className="mt-0.5 font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.requestedBy ? `Requested by ${a.requestedBy}` : "Automatic"}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{STATUS_TEXT[a.status]}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BackToActivity({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" /> Activity
    </button>
  );
}
function DetailRow({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      <div className="mt-1 leading-relaxed">{children}</div>
    </div>
  );
}

function IntelligenceTab() {
  const { state } = useOrgni();
  const [showAdvanced, setShowAdvanced] = useState(false);
  return (
    <div>
      <TabHeader title="Intelligence" description="How Orgni decides the right approach for each task." />
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="text-sm font-medium">Orgni Intelligence</div>
        <p className="mt-1 text-sm text-muted-foreground">
          Automatic. Recommended for every organisation — Orgni chooses the right approach for each task.
        </p>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="mt-4 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {showAdvanced ? "Hide" : "Show"} advanced settings
        </button>
        {showAdvanced ? (
          <div className="mt-3 space-y-2">
            {state.intelligence.advancedProviders.map((p) => (
              <div
                key={p}
                className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground opacity-70"
              >
                {p}
                <span className="text-xs">Coming soon</span>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Model providers are compute resources Orgni uses. You'll be able to route or restrict them here later.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate text-right font-medium">{value}</span>
    </div>
  );
}

export function useSettingsTab(): TabKey | null {
  const [location] = useLocation();
  return useMemo(() => settingsTabFromPath(location), [location]);
}
