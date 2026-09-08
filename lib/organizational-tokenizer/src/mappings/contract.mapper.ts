/**
 * Orgni Organizational Tokenizer — Contract Mapper
 * schema_version: "0.1.0"
 */
import type { OrganizationalToken } from "@workspace/contracts";
import { clampConfidence } from "@workspace/contracts";
import type { ContractExtraction } from "../envelopes/contract.js";
import { minConfidence, buildSourceRef, getStableTimestamp } from "./helpers.js";

export function mapContractToTokens(env: ContractExtraction): OrganizationalToken[] {
  const stableNow = getStableTimestamp(env);
  const tokens: OrganizationalToken[] = [];
  const primaryParty = env.parties?.[0]?.name?.value ?? "UNKNOWN";

  // Execution status is derived from signature evidence ONLY. Absent that, the
  // contract is NOT_EXECUTED — never inferred as executed from other content.
  const executionStatus =
    env.executionStatus?.value ??
    (env.signedDate?.value ? "EXECUTED" : "NOT_EXECUTED");

  // ── Token 0: CONTRACT_AGREEMENT (always) ─────────────────────────────────
  // Represents the agreement itself so an unsigned/partial contract still
  // produces a meaningful, reviewable fact (its parties, term, value, payment
  // terms and execution status) — not just a bare counterparty relationship.
  // Partial data is fine: optional fields are simply omitted.
  tokens.push({
    tokenId: `tok_${env.extractionId}_contract_agreement`,
    tenantId: env.tenantId,
    tokenKind: "STATE",
    eventType: "CONTRACT_AGREEMENT",
    subjectId: primaryParty,
    validTime: {
      from: env.effectiveDate.value,
      ...(env.expiryDate ? { to: env.expiryDate.value } : {}),
    },
    transactionTime: stableNow,
    scalarValue: {
      contractType: env.contractType.value,
      executionStatus,
      ...(env.title ? { title: env.title.value } : {}),
      ...(env.reference ? { reference: env.reference.value } : {}),
      parties: env.parties.map((p: any) => ({
        name: p.name.value,
        role: p.role.value,
      })),
      ...(env.contractValue
        ? { contractValue: env.contractValue.value, currency: env.currency?.value }
        : {}),
      ...(env.paymentTerms ? { paymentTerms: env.paymentTerms.value } : {}),
      ...(env.expiryDate ? { terminationDate: env.expiryDate.value } : {}),
    },
    sourceRefs: [buildSourceRef(env as any, 1, "contract-header")],
    confidence: clampConfidence(
      minConfidence(env.contractType.confidence, env.effectiveDate.confidence),
    ),
    // OBSERVED: the agreement and its terms are stated by the document. The
    // executionStatus scalar carries whether it is signed — an unsigned
    // agreement is a real, observed fact, it is simply NOT_EXECUTED.
    epistemicStatus: "OBSERVED",
    visibility: [],
    actionScope: ["legal", "contracts"],
    retentionClass: "legal",
    payloadRef: env.documentRef,
  });

  // ── Obligation policies (one per extracted "shall/must" clause) ──────────
  for (let i = 0; i < (env.obligations?.length ?? 0); i++) {
    const ob = env.obligations![i]!;
    tokens.push({
      tokenId: `tok_${env.extractionId}_obligation_${i}`,
      tenantId: env.tenantId,
      tokenKind: "POLICY",
      eventType: "CONTRACT_OBLIGATION",
      subjectId: primaryParty,
      validTime: {
        from: env.effectiveDate.value,
        ...(env.expiryDate ? { to: env.expiryDate.value } : {}),
      },
      transactionTime: stableNow,
      scalarValue: { clause: ob.value },
      sourceRefs: [buildSourceRef(env as any, 1, `obligation-${i}`)],
      confidence: clampConfidence(ob.confidence),
      epistemicStatus: "OBSERVED",
      visibility: [],
      actionScope: ["legal", "contracts"],
      retentionClass: "legal",
      payloadRef: env.documentRef,
    });
  }

  // ── Token 1: CONTRACT_EXECUTED ───────────────────────────────────────────
  const hasExecutionConfirmation = !!(env.signedDate?.value || (env as any).isExecuted?.value);

  if (hasExecutionConfirmation) {
    tokens.push({
      tokenId: `tok_${env.extractionId}_contract_executed`,
      tenantId: env.tenantId,
      tokenKind: "EVENT",
      eventType: "CONTRACT_EXECUTED",
      subjectId: primaryParty,
      validTime: {
        from: env.effectiveDate.value,
        ...(env.expiryDate ? { to: env.expiryDate.value } : {}),
      },
      transactionTime: stableNow,
      scalarValue: {
        contractType: env.contractType.value,
        ...(env.title ? { title: env.title.value } : {}),
        parties: env.parties.map((p: any) => ({
          name: p.name.value,
          role: p.role.value,
          ...(p.registrationNumber ? { registrationNumber: p.registrationNumber.value } : {}),
          ...(p.jurisdiction ? { jurisdiction: p.jurisdiction.value } : {}),
        })),
        ...(env.contractValue ? { contractValue: env.contractValue.value, currency: env.currency?.value } : {}),
        ...(env.governingLaw ? { governingLaw: env.governingLaw.value } : {}),
        ...(env.signedDate ? { signedDate: env.signedDate.value } : {}),
        ...(env.autoRenewal ? { autoRenewal: env.autoRenewal.value } : {}),
      },
      sourceRefs: [buildSourceRef(env as any, 1, "signature-block")],
      confidence: clampConfidence(
        minConfidence(env.contractType.confidence, env.effectiveDate.confidence),
      ),
      epistemicStatus: "OBSERVED",
      visibility: [],
      actionScope: ["legal", "contracts"],
      retentionClass: "legal",
      payloadRef: env.documentRef,
    });
  }

  // ── Tokens 2+: CONTRACT_COUNTERPARTY ─────────────────────────────────────
  for (let i = 0; i < env.parties.length; i++) {
    for (let j = i + 1; j < env.parties.length; j++) {
      const a = env.parties[i];
      const b = env.parties[j];
      tokens.push({
        tokenId: `tok_${env.extractionId}_relation_${i}_${j}`,
        tenantId: env.tenantId,
        tokenKind: "RELATION",
        subjectId: a.name.value,
        predicate: "CONTRACT_COUNTERPARTY",
        objectId: b.name.value,
        validTime: {
          from: env.effectiveDate.value,
          ...(env.expiryDate ? { to: env.expiryDate.value } : {}),
        },
        transactionTime: stableNow,
        scalarValue: {
          contractType: env.contractType.value,
          subjectRole: a.role.value,
          objectRole: b.role.value,
        },
        sourceRefs: [buildSourceRef(env as any, 1, `preamble-parties-${i}-${j}`)],
        confidence: clampConfidence(minConfidence(a.name.confidence, b.name.confidence)),
        epistemicStatus: "OBSERVED",
        visibility: [],
        actionScope: ["legal"],
        retentionClass: "legal",
        payloadRef: env.documentRef,
      });
    }
  }

  // ── Policy: CONTRACT_TERMINATION_TERMS ───────────────────────────────────
  if (env.terminationClause) {
    tokens.push({
      tokenId: `tok_${env.extractionId}_termination_policy`,
      tenantId: env.tenantId,
      tokenKind: "POLICY",
      eventType: "CONTRACT_TERMINATION_TERMS",
      transactionTime: stableNow,
      scalarValue: {
        clause: env.terminationClause.value,
        ...(env.noticePeriodDays ? { noticePeriodDays: env.noticePeriodDays.value } : {}),
        ...(env.autoRenewal ? { autoRenewal: env.autoRenewal.value } : {}),
      },
      sourceRefs: [buildSourceRef(env as any, 2, "termination-section")],
      confidence: clampConfidence(env.terminationClause.confidence),
      epistemicStatus: "OBSERVED",
      visibility: [],
      actionScope: ["legal"],
      retentionClass: "legal",
      payloadRef: env.documentRef,
    });
  }

  // ── Policy: CONTRACT_CONFIDENTIALITY_TERMS ───────────────────────────────
  if (env.confidentialityClause) {
    tokens.push({
      tokenId: `tok_${env.extractionId}_confidentiality_policy`,
      tenantId: env.tenantId,
      tokenKind: "POLICY",
      eventType: "CONTRACT_CONFIDENTIALITY_TERMS",
      transactionTime: stableNow,
      scalarValue: { clause: env.confidentialityClause.value },
      sourceRefs: [buildSourceRef(env as any, 2, "confidentiality-section")],
      confidence: clampConfidence(env.confidentialityClause.confidence),
      epistemicStatus: "OBSERVED",
      visibility: [],
      actionScope: ["legal"],
      retentionClass: "legal",
      payloadRef: env.documentRef,
    });
  }

  return tokens;
}
