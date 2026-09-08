import { useState, useRef } from "react";
import { listDocuments, uploadDocument } from "@/lib/api";
import { useData, ErrorState, EmptyState } from "./shared";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { FileText, Plus, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function Sources({ embedded = false }: { embedded?: boolean }) {
  const { data, loading, error, refetch } = useData(listDocuments);
  const { session } = useAuth();

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0 || !session) return;
    setUploading(true);
    setUploadProgress({ current: 0, total: files.length });
    setUploadError(null);

    const failures: string[] = [];
    let completed = 0;

    try {
      for (const file of files) {
        try {
          await uploadDocument(session.token, file);
        } catch (err: any) {
          const message =
            err.status === 503 ||
            err.code === "document_intelligence_unavailable"
              ? "processing service unavailable"
              : err.message || "processing failed";
          failures.push(`${file.name}: ${message}`);
        } finally {
          completed += 1;
          setUploadProgress({ current: completed, total: files.length });
        }
      }

      await refetch?.();

      if (failures.length > 0) {
        setUploadError(
          `${files.length - failures.length} of ${files.length} documents uploaded. ${failures.join(" | ")}`,
        );
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const sources = data?.documents || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full sm:w-auto">
          {!embedded && (
            <>
              <h1 className="text-2xl font-semibold tracking-tight mb-2">
                Evidence Sources
              </h1>
              <p className="text-muted-foreground text-sm">
                Processed organisational evidence.
              </p>
            </>
          )}
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            multiple
            onChange={onUpload}
            className="hidden"
            accept=".pdf,.docx,.xlsx,.pptx,.rtf,.txt,.md,.csv,.tsv,.json,.xml,.html,.htm,.png,.jpg,.jpeg"
          />
          <Button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full sm:w-auto"
          >
            {uploading ? (
              `Processing ${uploadProgress?.current ?? 0}/${uploadProgress?.total ?? 0}`
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Source
              </>
            )}
          </Button>
          <p className="mt-2 text-left text-xs text-muted-foreground sm:text-right">
            Select one or multiple PDF, Office, text, data, or image files
          </p>
        </div>
      </div>

      {uploadError && (
        <div className="p-4 rounded-lg border border-neutral-300 bg-neutral-100 text-neutral-800 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 text-sm flex gap-3 items-start">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{uploadError}</p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-muted/50 rounded-lg animate-pulse"
            />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} />
      ) : sources.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No evidence sources"
          description="Upload invoices, contracts, or proofs of payment. Orgni will continuously process them to build a living model of the organization."
        />
      ) : (
        <div className="rounded-lg border border-border divide-y divide-border bg-card">
          {sources.map((s) => (
            <Link key={s.sourceId} href={`/app/sources/${s.sourceId}`}>
              <div className="group flex cursor-pointer flex-col gap-3 px-4 py-4 text-sm transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="break-words font-medium transition-colors group-hover:text-primary">
                    {s.filename}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono">
                    {new Date(s.uploadedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                  <Badge
                    variant="secondary"
                    className="font-mono text-xs font-normal"
                  >
                    {s.documentType || "UNKNOWN"}
                  </Badge>
                  <Badge
                    variant={s.state === "COMPLETED" ? "default" : "outline"}
                    className="font-mono text-xs"
                  >
                    {s.state}
                  </Badge>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
