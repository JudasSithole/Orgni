/**
 * Orgni onboarding — a 7-step guided setup.
 *
 * Organisation → Connect → Context → Capabilities → Approvals → Teams → Ready.
 * Minimal progress indicator, one decision per screen, no technical vocabulary.
 */
import { useMemo, useRef, useState, type FormEvent } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  FileText,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useOrgni } from "@/lib/orgni/service";
import { ONBOARDING_STEPS } from "@/lib/orgni/defaults";
import { ToggleRow, ApprovalLevelSelect } from "@/components/app/controls";
import { TeamsPreview } from "@/components/app/teams-preview";
import { MicrosoftIcon, ServiceLogo, TeamsIcon } from "@/components/app/brand-icons";
import { READY_EXAMPLE_PROMPTS } from "@/lib/orgni/defaults";

export default function Onboarding() {
  const { state, setOnboardingStep, completeOnboarding } = useOrgni();
  const [, navigate] = useLocation();

  const initial = state.organisation
    ? Math.min(state.organisation.onboardingStep, 6)
    : 0;
  const [step, setStep] = useState(initial);

  const go = (next: number) => {
    const clamped = Math.max(0, Math.min(6, next));
    setStep(clamped);
    setOnboardingStep(clamped + 1);
    window.scrollTo(0, 0);
  };

  const finish = () => {
    completeOnboarding();
    navigate("/app");
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-xl flex-col px-5 py-10 sm:py-16">
      <ProgressBar step={step} />
      <div className="mt-10 flex-1">
        {step === 0 && <StepOrganisation onNext={() => go(1)} />}
        {step === 1 && (
          <StepConnect onNext={() => go(2)} onBack={() => go(0)} />
        )}
        {step === 2 && (
          <StepContext onNext={() => go(3)} onBack={() => go(1)} />
        )}
        {step === 3 && (
          <StepCapabilities onNext={() => go(4)} onBack={() => go(2)} />
        )}
        {step === 4 && (
          <StepApprovals onNext={() => go(5)} onBack={() => go(3)} />
        )}
        {step === 5 && (
          <StepTeams onNext={() => go(6)} onBack={() => go(4)} />
        )}
        {step === 6 && <StepReady onFinish={finish} />}
      </div>
    </div>
  );
}

function ProgressBar({ step }: { step: number }) {
  const total = ONBOARDING_STEPS.length;
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{ONBOARDING_STEPS[step].label}</span>
        <span>
          Step {step + 1} of {total}
        </span>
      </div>
      <div className="mt-2 flex gap-1.5">
        {ONBOARDING_STEPS.map((s, i) => (
          <div
            key={s.key}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-foreground" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function StepShell({
  title,
  copy,
  children,
  footer,
}: {
  title: string;
  copy: string;
  children?: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <div>
        <h1 className="text-2xl font-medium tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {copy}
        </p>
      </div>
      {children ? <div className="mt-8 flex-1">{children}</div> : <div className="flex-1" />}
      <div className="mt-10 flex items-center justify-between gap-3">{footer}</div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Back
    </button>
  );
}

/* ---------------- Step 1 — Organisation ---------------- */

function StepOrganisation({ onNext }: { onNext: () => void }) {
  const { state, createOrganisation } = useOrgni();
  const [name, setName] = useState(state.organisation?.name ?? "");
  const [email, setEmail] = useState(state.organisation?.workEmail ?? "");
  const [website, setWebsite] = useState(state.organisation?.website ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError("Organisation name and work email are required.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await createOrganisation({ name, workEmail: email, website });
      onNext();
    } catch {
      setError("Could not create your organisation. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <StepShell
        title="Set up your organisation"
        copy="Give Orgni the basics. You can add more later."
        footer={
          <>
            <span />
            <Button type="submit" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              Continue
              {!busy ? <ArrowRight className="size-4" /> : null}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="org-name">Organisation name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Inc."
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-email">Work email</Label>
            <Input
              id="org-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@acme.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="org-website">Company website</Label>
            <Input
              id="org-website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="acme.com"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
      </StepShell>
    </form>
  );
}

/* ---------------- Step 2 — Connect ---------------- */

function StepConnect({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { state, connect } = useOrgni();
  const [busy, setBusy] = useState(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const ms = state.connections.find((c) => c.key === "microsoft-365");
  const connected = ms?.status === "connected";

  async function doConnect() {
    setBusy(true);
    try {
      await connect("microsoft-365");
    } finally {
      setBusy(false);
    }
  }

  return (
    <StepShell
      title="Connect your workplace"
      copy="Let Orgni work with the tools your team already uses."
      footer={
        <>
          <BackButton onClick={onBack} />
          <Button onClick={onNext} disabled={!connected}>
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </>
      }
    >
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <MicrosoftIcon size={32} />
            <div>
              <div className="text-base font-medium">Microsoft 365</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Teams, Outlook, Calendar, SharePoint and OneDrive.
              </p>
            </div>
          </div>
          {connected ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-xs font-medium">
              <Check className="size-3.5" strokeWidth={3} />
              Connected
            </span>
          ) : null}
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm sm:grid-cols-3">
          {["Teams", "Outlook", "Calendar", "SharePoint", "OneDrive"].map((s) => (
            <li key={s} className="flex items-center gap-2 text-muted-foreground">
              <ServiceLogo label={s} size={16} />
              {s}
              {connected ? (
                <Check className="ml-auto size-3.5 text-foreground sm:ml-0" strokeWidth={3} />
              ) : null}
            </li>
          ))}
        </ul>

        {!connected ? (
          <Button className="mt-6" onClick={doConnect} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {busy ? "Connecting…" : "Connect Microsoft"}
          </Button>
        ) : (
          <div className="mt-5 border-t border-border pt-4">
            <button
              type="button"
              onClick={() => setShowPermissions((v) => !v)}
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronDown
                className={`size-4 transition-transform ${showPermissions ? "rotate-180" : ""}`}
              />
              View permissions
            </button>
            {showPermissions ? (
              <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                {(ms?.permissions ?? []).map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="text-border">—</span>
                    {p}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        This is a guided setup. A live Microsoft connection is not wired up yet —
        Orgni marks it as a demo connection until then.
      </p>
    </StepShell>
  );
}

/* ---------------- Step 3 — Context ---------------- */

function StepContext({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { state, addFiles } = useOrgni();
  const [, navigate] = useLocation();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const kn = state.knowledge;
  const hasSources = kn.sources.length > 0;
  const msConnected = state.connections.some(
    (c) => c.key === "microsoft-365" && c.status === "connected",
  );
  const gwConnected = state.connections.some(
    (c) => c.key === "google-workspace" && c.status === "connected",
  );

  const dataSources = [
    { label: "SharePoint", connected: msConnected },
    { label: "OneDrive", connected: msConnected },
    { label: "Google Drive", connected: gwConnected },
    { label: "CRM", connected: false },
    { label: "Database", connected: false },
    { label: "Custom API", connected: false },
  ];

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setBusy(true);
    try {
      const { added, failed } = await addFiles(files);
      toast({
        title:
          added > 0
            ? `${added} file${added === 1 ? "" : "s"} added`
            : "Nothing was added",
        description:
          added === 0
            ? "Orgni couldn't reach the ingestion service. See Settings."
            : failed > 0
              ? `${failed} could not be read.`
              : "Orgni is processing them now.",
      });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const discoveries = useMemo(
    () =>
      (
        [
          ["documents", "documents"],
          ["people", "people"],
          ["customers", "customers"],
          ["processes", "processes"],
        ] as const
      )
        .map(([key, label]) => ({ value: kn.counts[key] ?? 0, label }))
        .filter((d) => d.value > 0),
    [kn.counts],
  );

  return (
    <StepShell
      title="Help Orgni understand your business"
      copy="Add the information your team already works with."
      footer={
        <>
          <BackButton onClick={onBack} />
          <Button onClick={onNext}>
            {hasSources ? "Continue" : "Skip for now"}
            <ArrowRight className="size-4" />
          </Button>
        </>
      }
    >
      <input
        ref={fileRef}
        type="file"
        multiple
        className="hidden"
        onChange={onPick}
        accept=".pdf,.docx,.xlsx,.pptx,.rtf,.txt,.md,.csv,.tsv,.json,.xml,.html,.htm,.png,.jpg,.jpeg"
      />

      <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        Upload files
      </Button>

      <div className="mt-6 divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {dataSources.map((s) => (
          <div key={s.label} className="flex items-center justify-between px-4 py-3 text-sm">
            <span className="flex items-center gap-2.5">
              <ServiceLogo label={s.label} size={18} />
              {s.label}
            </span>
            {s.connected ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Check className="size-3.5 text-foreground" strokeWidth={3} />
                Connected
              </span>
            ) : (
              <button
                type="button"
                onClick={() => navigate("/app/settings/connections")}
                className="text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Connect
              </button>
            )}
          </div>
        ))}
      </div>

      {kn.state === "learning" ? (
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          Orgni is processing what you've added…
        </div>
      ) : null}

      {discoveries.length > 0 ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="text-sm font-medium">What Orgni found</div>
          <ul className="mt-3 grid grid-cols-2 gap-3 text-sm">
            {discoveries.map((d) => (
              <li key={d.label}>
                <span className="text-base font-medium tabular-nums">{d.value}</span>{" "}
                <span className="text-muted-foreground">{d.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {kn.sources.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {kn.sources.slice(0, 4).map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-2 text-xs text-muted-foreground"
            >
              <FileText className="size-3.5" />
              <span className="truncate">{s.name}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </StepShell>
  );
}

/* ---------------- Step 4 — Capabilities ---------------- */

function StepCapabilities({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { state, setCapability } = useOrgni();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const basic = state.capabilities.filter((c) => !c.advanced);
  const advanced = state.capabilities.filter((c) => c.advanced);

  return (
    <StepShell
      title="What should Orgni be able to do?"
      copy="You stay in control. Change these anytime."
      footer={
        <>
          <BackButton onClick={onBack} />
          <Button onClick={onNext}>
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </>
      }
    >
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {basic.map((c) => (
          <ToggleRow
            key={c.key}
            label={c.label}
            description={c.description}
            checked={c.enabled}
            onCheckedChange={(v) => setCapability(c.key, v)}
          />
        ))}
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown
            className={`size-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
          />
          Advanced controls
        </button>
        {showAdvanced ? (
          <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {advanced.map((c) => (
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
    </StepShell>
  );
}

/* ---------------- Step 5 — Approvals ---------------- */

function StepApprovals({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { state, setApproval } = useOrgni();
  return (
    <StepShell
      title="When should Orgni ask first?"
      copy="Set how much oversight you want for each kind of work."
      footer={
        <>
          <BackButton onClick={onBack} />
          <Button onClick={onNext}>
            Continue
            <ArrowRight className="size-4" />
          </Button>
        </>
      }
    >
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
        {state.approvals.map((a) => (
          <div key={a.key} className="px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-medium">{a.label}</div>
                <p className="mt-0.5 text-sm text-muted-foreground">{a.description}</p>
              </div>
              <ApprovalLevelSelect
                value={a.level}
                onChange={(lvl) => setApproval(a.key, lvl)}
              />
            </div>
          </div>
        ))}
      </div>
    </StepShell>
  );
}

/* ---------------- Step 6 — Teams ---------------- */

function StepTeams({
  onNext,
  onBack,
}: {
  onNext: () => void;
  onBack: () => void;
}) {
  const { state, installTeams } = useOrgni();
  const [busy, setBusy] = useState(false);
  const installed = state.teams.state === "installed";

  async function install() {
    setBusy(true);
    try {
      await installTeams();
    } finally {
      setBusy(false);
    }
  }

  return (
    <StepShell
      title="Bring Orgni to your team"
      copy="Your team can use Orgni directly where they already work."
      footer={
        <>
          <BackButton onClick={onBack} />
          <Button onClick={onNext}>
            {installed ? "Continue to Orgni" : "Skip for now"}
            <ArrowRight className="size-4" />
          </Button>
        </>
      }
    >
      <TeamsPreview />

      <div className="mt-6">
        {!installed ? (
          <Button onClick={install} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <TeamsIcon size={16} />}
            {busy ? "Adding Orgni…" : "Add Orgni to Microsoft Teams"}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm">
              <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                <Check className="size-3" strokeWidth={3} />
              </span>
              Orgni is available in Microsoft Teams
            </div>
            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" asChild>
                <a
                  href="https://teams.microsoft.com"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open Microsoft Teams
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>

      {!installed ? (
        <p className="mt-4 text-xs text-muted-foreground">
          This sets Orgni up in your workspace. The installable Teams app
          package and registration steps are in Settings → Teams app.
        </p>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          To finish, download the Teams app package in Settings → Teams app and
          upload it to Teams.
        </p>
      )}
    </StepShell>
  );
}

/* ---------------- Step 7 — Ready ---------------- */

function StepReady({ onFinish }: { onFinish: () => void }) {
  return (
    <StepShell
      title="Orgni is ready."
      copy="Your organisation is connected. Your team can start giving Orgni work."
      footer={
        <>
          <span />
          <Button onClick={onFinish}>
            Open Orgni
            <ArrowRight className="size-4" />
          </Button>
        </>
      }
    >
      <div className="space-y-2.5">
        {READY_EXAMPLE_PROMPTS.map((p) => (
          <div
            key={p}
            className="rounded-xl border border-border bg-card px-4 py-3 text-sm"
          >
            {p}
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Button variant="secondary" asChild>
          <a href="https://teams.microsoft.com" target="_blank" rel="noreferrer">
            Open Microsoft Teams
          </a>
        </Button>
      </div>
    </StepShell>
  );
}
