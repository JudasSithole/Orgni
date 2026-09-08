/**
 * Orgni Organizational Tokenizer — Public API
 *
 * Two surfaces:
 *   1. tokenizeCanonicalEvent / tokenizeCanonicalEvents — original (unchanged)
 *   2. tokenizeDocument — document-sourced tokenization (Phase 1 addition)
 */

import type { CanonicalEvent, OrganizationalToken, PrincipalRule } from "@workspace/contracts";
import { clampConfidence } from "@workspace/contracts";

export const TOKENIZER_VERSION = "orgni.organizational-tokenizer.v1";

export interface TokenizeOptions {
  visibility?: PrincipalRule[];
  actionScope?: string[];
  retentionClass?: string;
}

export function tokenizeCanonicalEvent(
  event: CanonicalEvent,
  options: TokenizeOptions = {},
): OrganizationalToken {
  return {
    tokenId: `tok_${event.eventId}`,
    tenantId: event.tenantId,
    tokenKind: "EVENT",
    eventType: event.eventType,
    subjectId: event.subjectId,
    objectId: event.objectId,
    transactionTime: event.transactionTime,
    validTime: event.occurredAt ? { from: event.occurredAt } : undefined,
    sourceRefs: event.sourceRefs,
    confidence: clampConfidence(event.confidence),
    epistemicStatus: event.epistemicStatus,
    visibility: options.visibility ?? [],
    actionScope: options.actionScope ?? [],
    retentionClass: options.retentionClass ?? "standard",
    payloadRef: event.eventId,
  };
}

export function tokenizeCanonicalEvents(
  events: CanonicalEvent[],
  options: TokenizeOptions = {},
): OrganizationalToken[] {
  return events.map((event) => tokenizeCanonicalEvent(event, options));
}

// ── Document tokenization (Phase 1) ──────────────────────────────────────────
export { tokenizeDocument } from "./tokenizer/document.tokenizer.js";
export type { DocumentExtraction, DocumentTokenizerResult } from "./tokenizer/document.tokenizer.js";

// ── Envelope types ────────────────────────────────────────────────────────────
export type { ExtractionEnvelopeBase, DocumentType, ExtractionStatus, ConfidenceMethod, FieldExtraction } from "./envelopes/types.js";
export type { InvoiceExtraction, InvoiceLineItem } from "./envelopes/invoice.js";
export type { ProofOfPaymentExtraction, PaymentMethod } from "./envelopes/proof_of_payment.js";
export type { ContractExtraction, ContractParty, ContractType } from "./envelopes/contract.js";

// ── Validator ─────────────────────────────────────────────────────────────────
export { validateToken, validateTokens } from "./validators/token.validator.js";
export type { TokenValidationResult, BatchValidationResult } from "./validators/token.validator.js";