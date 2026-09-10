/**
 * Settings → Teams app.
 *
 * Shows whether the bot is configured, lets an admin download the installable
 * Teams app package, link the Microsoft 365 tenant, and read the registration
 * steps. Also a "Test Orgni" box that runs the real engine without Teams.
 */
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useOrgni } from "@/lib/orgni/service";
import {
  productApi,
  teamsPackageUrl,
  type SimulateResult,
  type TeamsStatus,
} from "@/lib/orgni/http-service";
import { Panel } from "./primitives";

export function TeamsAppSection() {
  const { session } = useAuth();
  const { state } = useOrgni();
  const { toast } = useToast();
  const [status, setStatus] = useState<TeamsStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [aad, setAad] = useState(state.organisation?.teamsAadTenantId ?? "");
  const [linking, setLinking] = useState(false);
  const linkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!session) return;
    productApi.teamsStatus(session.token).then(setStatus).catch(() => setStatus(null));
  }, [session]);

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
    } catch {
      toast({ title: "Could not link tenant" });
    } finally {
      setLinking(false);
    }
  }

  const configured = status?.configured ?? false;

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium">Teams app</h2>
      <Panel className="space-y-5 p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Bot status</span>
          <span
            className={`inline-flex items-center gap-1.5 ${configured ? "" : "text-muted-foreground"}`}
          >
            <span
              className={`size-2 rounded-full ${configured ? "bg-emerald-500" : "bg-amber-500"}`}
            />
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
          The <code>.zip</code> contains the app manifest and icons, generated
          for this deployment. Upload it in Teams admin center or the Teams
          client (Apps → Manage your apps → Upload an app).
        </p>

        <div className="space-y-2 border-t border-border pt-4">
          <label className="text-xs font-medium">
            Microsoft 365 tenant id (for message routing)
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
            Your Entra/AAD tenant id. Messages from that tenant route to this
            organisation. Skip this if you set <code>TEAMS_DEFAULT_ORGNI_TENANT</code>.
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

      <TestOrgni />
    </section>
  );
}

function TestOrgni() {
  const { session } = useAuth();
  const { refresh } = useOrgni();
  const [text, setText] = useState("prepare everything for tomorrow's client meeting");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SimulateResult | null>(null);

  async function run() {
    if (!session || !text.trim()) return;
    setBusy(true);
    setResult(null);
    try {
      setResult(await productApi.simulate(session.token, text.trim(), "You (test)"));
      refresh();
    } catch {
      setResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="space-y-3 p-5">
      <div className="text-sm font-medium">Test Orgni</div>
      <p className="text-xs text-muted-foreground">
        Runs the same engine the Teams bot uses, against your current settings.
        The result is logged to Activity.
      </p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={2}
        className="text-sm"
      />
      <Button size="sm" onClick={run} disabled={busy}>
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
      <dt>{label}</dt>
      <dd className={`text-right text-foreground/70 ${mono ? "font-mono break-all" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

const REGISTRATION_STEPS = [
  "Create an Azure Bot resource (or an Entra app registration + Azure Bot). Note the app (client) id and create a client secret.",
  "Set MICROSOFT_APP_ID, MICROSOFT_APP_PASSWORD, MICROSOFT_APP_TYPE and (if SingleTenant) MICROSOFT_APP_TENANT_ID on the API server, plus PUBLIC_BASE_URL.",
  "In the Azure Bot's Configuration, set the Messaging endpoint to the value shown above (…/api/teams/messages) and enable the Microsoft Teams channel.",
  "Generate a GUID for the Teams app itself and set TEAMS_APP_ID. Re-download the package so the manifest picks it up.",
  "Upload the package: Teams admin center → Teams apps → Manage apps → Upload, or sideload via Teams (Apps → Manage your apps → Upload an app).",
  "Either set TEAMS_DEFAULT_ORGNI_TENANT for a single org, or link your Microsoft 365 tenant id above so messages route correctly.",
  "In a Teams chat or channel, add Orgni and mention @Orgni to test.",
];
