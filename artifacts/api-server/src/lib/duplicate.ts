/**
 * Potential business-duplicate detection (Phase 1 item 6).
 *
 * Exact duplicates (same checksum) are handled upstream by content-addressed
 * dedup. This finds *potential business duplicates*: a different file (different
 * checksum) that carries the same high-value identifiers — invoice number,
 * supplier, amount and currency. Such a document is FLAGGED for review, never
 * merged: cross-document entity resolution is Phase 2.
 */

type Json = Record<string, unknown>;

function norm(v: unknown): string {
  return String(v ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Build a stable business key from an invoice's tokens (invoice number +
 * supplier + amount + currency). Returns null when the document is not an
 * invoice or lacks the identifiers that make a duplicate meaningful.
 */
export function invoiceBusinessKey(tokens: Json[]): string | null {
  const issued = tokens.find((t) => t["eventType"] === "INVOICE_ISSUED");
  if (!issued) return null;
  const sv = (issued["scalarValue"] ?? {}) as Json;
  const invoiceNumber = norm(sv["invoiceNumber"]);
  const vendor = norm(issued["subjectId"]);
  const amount = norm(sv["totalAmount"]);
  const currency = norm(sv["currency"]);
  // Require at least an invoice number and an amount — the identifiers that make
  // two documents plausibly the same business event.
  if (!invoiceNumber || !amount) return null;
  return `inv:${invoiceNumber}|sup:${vendor}|amt:${amount}|cur:${currency}`;
}

export interface SourceTokens {
  sourceId: string;
  tokens: Json[];
}

/**
 * Given the new document's tokens and the tenant's existing documents, return
 * the sourceId of a potential business duplicate (matching key, different
 * source), or null. Never merges — only reports.
 */
export function findPotentialDuplicate(
  newTokens: Json[],
  existing: SourceTokens[],
  selfSourceId?: string,
): { sourceId: string; key: string } | null {
  const key = invoiceBusinessKey(newTokens);
  if (!key) return null;
  for (const doc of existing) {
    if (doc.sourceId === selfSourceId) continue;
    if (invoiceBusinessKey(doc.tokens) === key) {
      return { sourceId: doc.sourceId, key };
    }
  }
  return null;
}
