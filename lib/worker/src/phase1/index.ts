/**
 * Phase 1 orchestration and the ontology handoff boundary.
 *
 * Runs the full flow:
 *   upload → ingestion → Document Intelligence → normalized envelope v0.1.0
 *          → envelope validation → real tokenizeDocument → OrganizationalToken[]
 *
 * Phase 1 stops here, on purpose. `TokenizationResult` is the documented
 * interface the Organizational Ontology consumes. Nothing in this module maps
 * tokens to ontology entities, resolves identity across documents, stores a
 * graph, or reasons over state — those are ontology concerns.
 */

import { tokenizeDocument } from "@workspace/organizational-tokenizer";
import type { OrganizationalToken } from "@workspace/contracts";

import { adaptEnvelope } from "../envelope/adapter.js";
import { validateEnvelope } from "../envelope/validate.js";
import type { NormalizedEnvelope } from "../envelope/types.js";
import {
  ingestDocument,
  type DocumentIntelligence,
  type IngestOptions,
  type IngestionInput,
  type IngestionRecord,
} from "../ingestion/pipeline.js";
import { tokenizeGenericEnvelope } from "./generic-tokenizer.js";

/** The Phase 1 → ontology handoff contract. */
export interface TokenizationResult {
  sourceId: string;
  schemaVersion: "0.1.0";
  tokens: OrganizationalToken[];
  warnings: string[];
}

/** Everything above, plus the pipeline detail callers need for observability. */
export interface Phase1Result extends TokenizationResult {
  state: IngestionRecord["state"];
  documentType: NormalizedEnvelope["document_type"] | "UNPROCESSED";
  errors: string[];
  record: IngestionRecord;
}

function handoff(
  sourceId: string,
  tokens: OrganizationalToken[],
  warnings: string[],
): TokenizationResult {
  return { sourceId, schemaVersion: "0.1.0", tokens, warnings };
}

/**
 * Tokenize an already-validated envelope.
 *
 * Exported separately so the tokenization step can be exercised directly. This
 * always calls the real tokenizer; there is no mock path.
 */
export function tokenizeEnvelope(envelope: NormalizedEnvelope): {
  tokens: OrganizationalToken[];
  warnings: string[];
  errors: string[];
} {
  const validation = validateEnvelope(envelope);
  if (!validation.valid) {
    return {
      tokens: [],
      warnings: validation.warnings,
      errors: validation.errors,
    };
  }

  if (envelope.document_type === "UNKNOWN") {
    const tokens = tokenizeGenericEnvelope(envelope);
    return {
      tokens,
      warnings: [
        ...validation.warnings,
        ...(tokens.length > 0
          ? ["generic_evidence_tokenization: review extracted context"]
          : ["generic_evidence_tokenization: no explicit context recognized"]),
      ],
      errors: [],
    };
  }

  const adapted = adaptEnvelope(envelope);
  if (!adapted.ok || !adapted.extraction) {
    const evidenceTokens = tokenizeGenericEnvelope(envelope);
    return {
      tokens: evidenceTokens,
      warnings: [
        ...validation.warnings,
        ...adapted.warnings,
        ...(evidenceTokens.length > 0
          ? [
              "structured_adapter_incomplete: preserved generic business evidence",
            ]
          : []),
      ],
      errors: adapted.errors,
    };
  }

  try {
    const result = tokenizeDocument(adapted.extraction);
    const genericTokens = tokenizeGenericEnvelope(envelope);
    const tokenIds = new Set(result.tokens.map((token) => token.tokenId));
    const supplemental = genericTokens.filter(
      (token) => !tokenIds.has(token.tokenId),
    );
    return {
      tokens: [...result.tokens, ...supplemental],
      warnings: [
        ...validation.warnings,
        ...adapted.warnings,
        ...result.warnings,
      ],
      errors: result.errors,
    };
  } catch (error) {
    // The tokenizer throws on an unsupported document type. Convert it to a
    // controlled failure so the pipeline reports rather than crashes.
    return {
      tokens: [],
      warnings: [...validation.warnings, ...adapted.warnings],
      errors: [
        `tokenization_failed: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
}

/**
 * Run one document end to end.
 *
 * Always resolves. An unsupported, unreadable or unclassifiable document comes
 * back with `state: "FAILED"` (or COMPLETED with zero tokens for UNKNOWN) and
 * populated warnings — never an exception.
 */
export async function processDocument(
  input: IngestionInput,
  documentIntelligence: DocumentIntelligence,
  options: IngestOptions = {},
): Promise<Phase1Result> {
  const record = await ingestDocument(input, documentIntelligence, options);

  if (record.state === "FAILED" || !record.envelope) {
    return {
      ...handoff(record.sourceId, [], record.warnings),
      state: record.state,
      documentType: record.envelope?.document_type ?? "UNPROCESSED",
      errors: record.errors,
      record,
    };
  }

  if (record.duplicateOf) {
    return {
      ...handoff(record.sourceId, [], record.warnings),
      state: record.state,
      documentType: record.envelope.document_type,
      errors: [],
      record,
    };
  }

  const { tokens, warnings, errors } = tokenizeEnvelope(record.envelope);

  return {
    ...handoff(record.sourceId, tokens, [...record.warnings, ...warnings]),
    // Extraction can complete even when a document needs review or cannot yet
    // produce ontology tokens. FAILED is reserved for ingestion/transport.
    state: record.state,
    documentType: record.envelope.document_type,
    errors,
    record,
  };
}

/** Narrow a full pipeline result down to the ontology handoff surface. */
export function toHandoff(result: Phase1Result): TokenizationResult {
  return handoff(result.sourceId, result.tokens, result.warnings);
}
