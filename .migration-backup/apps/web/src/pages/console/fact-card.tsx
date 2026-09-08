import { useState } from "react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, ChevronDown, Check, X, Pencil, Eye } from "lucide-react";

/* ── Human-readable helpers (item 4 + item 3) ─────────────────────────────── */

/**
 * Turn a machine key into a readable label:
 * CONTRACT_COUNTERPARTY → "Contract counterparty", dueDate → "Due date".
 */
export function humanizeType(raw: unknown): string {
  const s = String(raw ?? "")
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2") // split camelCase
    .trim()
    .toLowerCase();
  if (!s) return "Fact";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Epistemic status → what it means for a reader. */
const EPISTEMIC: Record<string, { label: string; blurb: string }> = {
  OBSERVED: { label: "Directly found", blurb: "Directly found in the source" },
  ASSERTED: { label: "Claimed", blurb: "Claimed by the source" },
  INFERRED: {
    label: "Inferred",
    blurb: "Derived by Orgni — requires verification",
  },
  PENDING_VERIFICATION: { label: "Pending", blurb: "Awaiting verification" },
  DISPUTED: { label: "Disputed", blurb: "Conflicting evidence" },
  NEEDS_REVIEW: {
    label: "Needs review",
    blurb: "Evidence or confidence is insufficient",
  },
};

export function epistemicMeaning(status: string) {
  return (
    EPISTEMIC[status] ?? { label: humanizeType(status), blurb: String(status) }
  );
}

/** Confidence → review tier (item 3 thresholds). Kept separate from epistemic status. */
export function reviewTier(confidence: number | null | undefined) {
  if (confidence == null)
    return { label: "Review required", tone: "red" as const };
  if (confidence >= 0.85)
    return { label: "Eligible for approval", tone: "green" as const };
  if (confidence >= 0.6)
    return { label: "Review recommended", tone: "amber" as const };
  return { label: "Review required", tone: "red" as const };
}

const TONE: Record<string, string> = {
  green:
    "border-neutral-300 bg-neutral-100 text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100",
  amber:
    "border-neutral-400 bg-neutral-200 text-neutral-900 dark:border-neutral-500 dark:bg-neutral-700 dark:text-neutral-100",
  red: "border-neutral-500 bg-neutral-300 text-black dark:border-neutral-400 dark:bg-neutral-600 dark:text-white",
};

type Json = Record<string, unknown>;

export interface FactCardProps {
  /** The ontology fact or relationship object. */
  data: Json;
  /** Provenance source (document). */
  source: { sourceId: string; filename: string };
  /** "fact" or "relationship" — controls subject/object field names. */
  kind: "fact" | "relationship";
  /** Optional review action (Approve/Reject/Correct). */
  onReview?: (action: "CORRECT" | "REJECT" | "APPROVE") => void;
  reviewState?: string | null;
}

/** Pull the fields worth showing to a human; hide the raw/technical ones. */
const TECHNICAL_KEYS = new Set([
  "fact_id",
  "token_id",
  "tenant_id",
  "checksum",
  "provenance",
  "source_refs",
  "sourceObjectId",
  "evidenceId",
  "sourceSystem",
  "transaction_time",
  "payloadRef",
  "documentRef",
]);

export function FactCard({
  data,
  source,
  kind,
  onReview,
  reviewState,
}: FactCardProps) {
  const [showTech, setShowTech] = useState(false);

  const title = humanizeType(
    kind === "relationship" ? data["predicate"] : data["fact_type"],
  );
  const subject = String(
    (kind === "relationship" ? data["subject_ref"] : data["subject"]) ?? "",
  );
  const object = String(
    (kind === "relationship" ? data["object_ref"] : data["object"]) ?? "",
  );
  const value = data["scalar_value"];
  const status = String(data["epistemic_status"] ?? "ASSERTED");
  const confidence =
    typeof data["confidence"] === "number"
      ? (data["confidence"] as number)
      : null;
  const validFrom = data["valid_from"];

  const meaning = epistemicMeaning(status);
  const tier = reviewTier(confidence);

  // Human-facing key/values (everything that isn't technical or already shown).
  const shownKeys = new Set([
    "fact_type",
    "predicate",
    "subject",
    "object",
    "subject_ref",
    "object_ref",
    "epistemic_status",
    "confidence",
    "fact_kind",
    "valid_from",
    "valid_to",
    "attributes",
    "scalar_value",
  ]);
  const extra = Object.entries(data).filter(
    ([k, v]) => !TECHNICAL_KEYS.has(k) && !shownKeys.has(k) && v != null,
  );
  // Expand a structured scalar_value into readable rows rather than a JSON blob.
  const valueRows: Array<[string, unknown]> =
    value != null && typeof value === "object"
      ? Object.entries(value as Json).filter(([, v]) => v != null)
      : value != null
        ? [["Value", value]]
        : [];

  return (
    <div className="p-4 rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {(subject || object) && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {subject}
              {object && (
                <>
                  {" "}
                  <span className="text-muted-foreground/60">→</span> {object}
                </>
              )}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className="text-[11px] font-normal"
            title={meaning.blurb}
          >
            {meaning.label}
          </Badge>
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border ${TONE[tier.tone]}`}
            title={
              confidence != null
                ? `Confidence ${(confidence * 100).toFixed(0)}%`
                : "No confidence score"
            }
          >
            {tier.label}
          </span>
        </div>
      </div>

      {/* Value / extra readable fields */}
      {(valueRows.length > 0 || extra.length > 0 || validFrom != null) && (
        <dl className="mt-3 grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-[auto,1fr] sm:gap-y-1">
          {valueRows.map(([k, v]) => (
            <FieldRow key={k} label={humanizeType(k)} value={v} />
          ))}
          {validFrom != null && (
            <>
              <dt className="text-muted-foreground">Valid from</dt>
              <dd className="break-words">{String(validFrom)}</dd>
            </>
          )}
          {extra.map(([k, v]) => (
            <FieldRow key={k} label={humanizeType(k)} value={v} />
          ))}
        </dl>
      )}

      {/* Meta row: confidence %, source, evidence */}
      <div className="mt-3 pt-3 border-t border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="inline-flex min-w-0 flex-wrap items-center gap-1.5">
          <FileText className="w-3 h-3 shrink-0" />
          <Link
            href={`/app/sources/${source.sourceId}`}
            className="max-w-[180px] truncate hover:underline sm:max-w-[220px]"
          >
            {source.filename}
          </Link>
          {confidence != null && (
            <span>· {(confidence * 100).toFixed(0)}% confidence</span>
          )}
          {reviewState && <span>· {reviewState}</span>}
        </span>
        <div className="flex w-full flex-wrap items-center gap-1 sm:w-auto">
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
          >
            <Link href={`/app/sources/${source.sourceId}`}>
              <Eye className="w-3 h-3 mr-1" /> View evidence
            </Link>
          </Button>
          {onReview && (
            <>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onReview("CORRECT")}
              >
                <Pencil className="w-3 h-3 mr-1" /> Correct
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onReview("REJECT")}
              >
                <X className="w-3 h-3 mr-1" /> Reject
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onReview("APPROVE")}
              >
                <Check className="w-3 h-3 mr-1" /> Approve
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Technical details (collapsed) */}
      <button
        type="button"
        onClick={() => setShowTech((s) => !s)}
        className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 hover:text-foreground transition-colors"
      >
        <ChevronDown
          className={`w-3 h-3 transition-transform ${showTech ? "rotate-180" : ""}`}
        />
        Technical details
      </button>
      {showTech && (
        <pre className="mt-2 text-[11px] bg-muted/40 rounded-md p-3 overflow-x-auto max-h-64">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: unknown }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">
        {typeof value === "object" ? JSON.stringify(value) : String(value)}
      </dd>
    </>
  );
}
