/**
 * Settings → Microsoft Teams.
 *
 * Founder-facing UX: one clear card, "Connect" or "Connected" — no tenant
 * IDs, client IDs, secrets, or scopes. Technical detail (messaging endpoint,
 * app package download, registration steps, manual tenant-id fallback) is
 * one click away behind "Manage", never the default view.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import {
  productApi,
  teamsPackageUrl,
  type AskResult,
  type TeamsStatus,
} from "@/lib/orgni/http-service";
import { TeamsIcon } from "./brand-icons";
import { Panel } from "./primitives";

export function TeamsAppSection() {
  const { session } = useAuth();
  const { state, refresh } = useOrgni();
  const { toast } = useToast();
  const [status, setStatus] = useState<TeamsStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const loadStatus = () => {
    if (!session) return;
    productApi.teamsStatus(session.token).then(setStatus).catch(() => setStatus(null));
  };

  useEffect(loadStatus, [session]);

  // Land back here after the Microsoft admin-consent redirect.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("teams_connected")) {
      toast({ title: "Microsoft Teams connected" });
      loadStatus();
      refresh();
    } else if (params.get("teams_error")) {
      const reason = params.get("teams_error");
      toast({
        title: "Couldn't connect Microsoft Teams",
        description:
          reason === "linked_to_other_org"
            ? "That Microsoft 365 tenant is already connected to a different Orgni organisation."
            : reason === "consent_declined"
              ? "The Microsoft admin approval wasn't completed."
              : "Please try again.",
      });
    }
    if (params.has("teams_connected") || params.has("teams_error")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("teams_connected");
      url.searchParams.delete("teams_error");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    if (!session) return;
    setConnecting(true);
    try {
      const { url } = await productApi.connectTeamsStart(session.token);
      window.location.href = url;
    } catch {
      toast({ title: "Could not start Microsoft sign-in", description: "Try again in a moment." });
      setConnecting(false);
    }
  }

  async function disconnect() {
    if (!session) return;
    setDisconnecting(true);
    try {
      await productApi.disconnectTeams(session.token);
      toast({ title: "Microsoft Teams disconnected" });
      loadStatus();
    } finally {
      setDisconnecting(false);
    }
  }

  const connection = status?.connection ?? null;
  const connectedByMember = connection
    ? state.members.find((m) => m.email === connection.connectedBy)
    : null;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">Microsoft Teams</h2>

      <Panel className="p-5">
        <div className="flex items-start gap-3">
          <TeamsIcon size={28} />
          <div className="min-w-0 flex-1">
            {connection ? (
              <>
                <div className="flex items-center gap-2 text-sm font-medium">
                  Connected
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <Row label="Organisation" value={state.organisation?.name ?? "—"} />
                  <Row
                    label="Connected by"
                    value={connectedByMember?.name || connection.connectedBy || "—"}
                  />
                  <Row label="Status" value="Active" />
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setManageOpen((v) => !v)}>
                    Manage
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" disabled={disconnecting}>
                        Disconnect
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Disconnect Microsoft Teams?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Orgni will stop responding to @Orgni mentions for this organisation
                          until it's reconnected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={disconnect}>Disconnect</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </>
            ) : (
              <>
                <div className="text-sm font-medium">Not connected</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Connect Orgni to Microsoft Teams so your team can ask Orgni questions
                  directly from Teams.
                </p>
                {status?.connectAvailable ? (
                  <Button className="mt-4" onClick={connect} disabled={connecting}>
                    {connecting ? <Loader2 className="size-4 animate-spin" /> : null}
                    Connect Microsoft Teams
                  </Button>
                ) : (
                  <p className="mt-4 text-xs text-muted-foreground">
                    Orgni isn't ready to connect to Microsoft Teams yet — this needs a
                    one-time setup by your Orgni admin.{" "}
                    <button
                      type="button"
                      onClick={() => setManageOpen(true)}
                      className="font-medium text-foreground hover:underline"
                    >
                      Details
                    </button>
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </Panel>

      {manageOpen ? <ManagePanel status={status} onLinked={loadStatus} /> : null}

      <TestOrgni />
    </section>
  );
}

/** Everything technical — tucked behind "Manage" / "Details", never the default view. */
function ManagePanel({
  status,
  onLinked,
}: {
  status: TeamsStatus | null;
  onLinked: () => void;
}) {
  const { session } = useAuth();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [aad, setAad] = useState("");
  const [linking, setLinking] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);
  const configured = status?.configured ?? false;

  async function download() {
    if (!session) return;
    setDownloading(true);
    try {
      const res = await fetch(teamsPackageUrl(), {
        headers: { authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) throw new Error("download failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = linkRef.current!;
      a.href = url;
      a.download = "orgni-teams-app.zip";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch {
      toast({ title: "Could not build the package", description: "Try again in a moment." });
    } finally {
      setDownloading(false);
    }
  }

  async function link() {
    if (!session || !aad.trim()) return;
    setLinking(true);
    try {
      await productApi.linkTeams(session.token, aad.trim());
      toast({ title: "Microsoft 365 tenant linked" });
      onLinked();
    } catch {
      toast({ title: "Could not link tenant" });
    } finally {
      setLinking(false);
    }
  }

  return (
    <Panel className="space-y-5 p-5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Bot status</span>
        <span className={`inline-flex items-center gap-1.5 ${configured ? "" : "text-muted-foreground"}`}>
          <span className={`size-2 rounded-full ${configured ? "bg-emerald-500" : "bg-amber-500"}`} />
          {configured ? "Configured" : "Not registered yet"}
        </span>
      </div>

      {status ? (
        <dl className="space-y-1.5 text-xs text-muted-foreground">
          <Row label="Messaging endpoint" value={status.messagingEndpoint} mono />
          <Row label="Bot app id" value={status.botId ?? "— set MICROSOFT_APP_ID"} mono />
          <Row label="App type" value={status.appType} />
        </dl>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={download} disabled={downloading}>
          {downloading ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
          Download Teams app package
        </Button>
        <a ref={linkRef} className="hidden" aria-hidden />
      </div>
      <p className="text-xs text-muted-foreground">
        The <code>.zip</code> contains the app manifest and icons, generated for this
        deployment. Upload it in Teams admin center or the Teams client (Apps → Manage
        your apps → Upload an app).
      </p>

      <div className="space-y-2 border-t border-border pt-4">
        <label className="text-xs font-medium">
          Manual fallback — Microsoft 365 tenant id
        </label>
        <div className="flex gap-2">
          <Input
            value={aad}
            onChange={(e) => setAad(e.target.value)}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="font-mono text-xs"
          />
          <Button variant="outline" onClick={link} disabled={linking || !aad.trim()}>
            {linking ? <Loader2 className="size-4 animate-spin" /> : "Link"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Only needed if "Connect Microsoft Teams" isn't available yet. Paste the
          organisation's Entra/AAD tenant id.
        </p>
      </div>

      <div className="border-t border-border pt-4">
        <button
          type="button"
          onClick={() => setShowSteps((v) => !v)}
          className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={`size-4 transition-transform ${showSteps ? "rotate-180" : ""}`} />
          Registration steps
        </button>
        {showSteps ? (
          <ol className="mt-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
            {REGISTRATION_STEPS.map((s, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-mono text-foreground/60">{i + 1}.</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </Panel>
  );
}

function TestOrgni() {
  const { session } = useAuth();
  const { refresh } = useOrgni();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AskResult | null>(null);

  async function run() {
    if (!session || !text.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      setResult(await productApi.ask(session.token, text.trim()));
      refresh();
    } catch {
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="space-y-3 p-5">
      <div className="text-sm font-medium">Ask Orgni</div>
      <p className="text-xs text-muted-foreground">
        Give Orgni work from here — the same as mentioning @Orgni in Teams. The
        result is logged to Activity.
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        placeholder="e.g. find the latest signed contract for this account"
        className="text-sm"
      />
      <Button size="sm" onClick={run} disabled={busy || !text.trim()}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Send to Orgni
      </Button>
      {result ? (
        <div className="space-y-2 rounded-lg border border-border bg-background p-3 text-sm">
          <p className="whitespace-pre-wrap">{result.reply}</p>
          <p className="text-xs text-muted-foreground">
            Logged as “{result.action.title}” · {result.action.status.replace("_", " ")}
            {result.needsApproval ? " · needs approval" : ""}
          </p>
        </div>
      ) : null}
    </Panel>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex flex-wrap justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-right ${mono ? "break-all font-mono text-foreground/70" : "font-medium"}`}>
        {value}
      </dd>
    </div>
  );
}

const REGISTRATION_STEPS = [
  "Create an Entra App Registration (this also serves as the Azure Bot's identity). Note the Application (client) ID and create a client secret.",
  "Set MICROSOFT_APP_ID, MICROSOFT_APP_PASSWORD, MICROSOFT_APP_TYPE, PUBLIC_BASE_URL on the API server.",
  "Add a Web redirect URI on the App Registration: {PUBLIC_BASE_URL}/api/teams/connect/callback — this is what makes the \"Connect Microsoft Teams\" button work.",
  "Create an Azure Bot resource using that same Application ID. In its Configuration, set the messaging endpoint shown above and enable the Microsoft Teams channel.",
  "Generate a GUID for the Teams app itself and set TEAMS_APP_ID. Re-download the package so the manifest picks it up.",
  "Upload the package: Teams admin center → Teams apps → Manage apps → Upload, or sideload via Teams (Apps → Manage your apps → Upload an app).",
  "In a Teams chat or channel, add Orgni and mention @Orgni to test.",
];
