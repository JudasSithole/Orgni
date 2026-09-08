import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  API_URL,
  type CreatedApiKey,
} from "@/lib/api";
import { useData, ErrorState, ConsolePageHeader } from "./shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Copy, Trash2, Plus, Terminal } from "lucide-react";

export default function Developer() {
  const { session } = useAuth();
  const { toast } = useToast();
  const { data, loading, error, refetch } = useData(listApiKeys);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<CreatedApiKey | null>(null);

  const keys = data?.keys ?? [];
  const apiBase = (API_URL || "http://localhost:8080").replace(/\/$/, "");

  function copy(text: string, label = "Copied") {
    navigator.clipboard?.writeText(text).then(
      () => toast({ title: label }),
      () => toast({ title: "Copy failed", variant: "destructive" }),
    );
  }

  async function create() {
    if (!session || !name.trim()) return;
    setBusy(true);
    try {
      const key = await createApiKey(session.token, name.trim());
      setCreated(key);
      setName("");
      refetch();
    } catch {
      toast({ title: "Could not create key", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string, keyName: string) {
    if (!session) return;
    if (
      !window.confirm(`Revoke "${keyName}"? Agents using it will stop working.`)
    )
      return;
    try {
      await revokeApiKey(session.token, id);
      toast({ title: "Key revoked" });
      refetch();
    } catch {
      toast({ title: "Could not revoke key", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <ConsolePageHeader
        title="Developer"
        description="Create and manage API keys, then use them to power AI agents and services with your organisation's trusted context."
      />

      {/* Create a key */}
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">API keys</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          A key authenticates requests to the Orgni API for your tenant. Give
          each agent or service its own key so you can revoke them
          independently.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder='Key name (e.g. "Support agent — prod")'
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
            className="sm:max-w-md"
          />
          <Button onClick={create} disabled={busy || !name.trim()}>
            <Plus className="mr-1 size-4" /> Create key
          </Button>
        </div>

        {/* One-time secret reveal */}
        {created && (
          <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
            <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
              Copy your key now — it is shown only once and cannot be retrieved
              later.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-background px-2 py-1.5 font-mono text-xs">
                {created.key}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copy(created.key, "Key copied")}
              >
                <Copy className="mr-1 size-3" /> Copy
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setCreated(null)}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Existing keys */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Your keys</h3>
        {loading ? (
          <div className="h-24 animate-pulse rounded-lg bg-muted/50" />
        ) : error ? (
          <ErrorState error={error} />
        ) : keys.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No API keys yet. Create one above to start calling the Orgni API.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Key</th>
                  <th className="px-4 py-2 font-medium">Created</th>
                  <th className="px-4 py-2 font-medium">Last used</th>
                  <th className="px-4 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {keys.map((k) => (
                  <tr key={k.id} className={k.revoked ? "opacity-50" : ""}>
                    <td className="px-4 py-3 font-medium">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {k.keyPrefix}…
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(k.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {k.lastUsedAt
                        ? new Date(k.lastUsedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {k.revoked ? (
                        <Badge variant="outline" className="text-[11px]">
                          Revoked
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => revoke(k.id, k.name)}
                        >
                          <Trash2 className="mr-1 size-3" /> Revoke
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quickstart for agent builders */}
      <section className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Terminal className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Quickstart — power an agent</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Send your key as a bearer token. An agent can upload evidence and read
          trusted organisational context — the same API the console uses.
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-muted/40 p-3 text-[12px] leading-relaxed">
          {`# Base URL
API=${apiBase}
KEY=orgni_sk_...            # your key

# 1) Let the agent read organisational context
curl $API/api/model/overview -H "authorization: Bearer $KEY"

# 2) Feed the agent new evidence (a document)
curl -X POST $API/api/documents \\
  -H "authorization: Bearer $KEY" \\
  -F "file=@invoice.pdf"

# 3) Read back the extracted, evidence-backed facts
curl $API/api/model/facts -H "authorization: Bearer $KEY"`}
        </pre>
        <p className="mt-3 text-xs text-muted-foreground">
          Full endpoint reference:{" "}
          <a href="/docs" className="underline hover:text-foreground">
            API documentation
          </a>
          . Keys are tenant-scoped — an agent only ever sees its own
          organisation's context.
        </p>
      </section>
    </div>
  );
}
