/**
 * Orgni Organizational Tokenizer — Token Validator
 * schema_version: "0.1.0"
 *
 * Last line of defence before tokens leave the tokenizer boundary.
 * ERROR   = token rejected, must not be emitted
 * WARNING = token emitted but flagged for human review
 */

import type { OrganizationalToken } from "@workspace/contracts";

export interface TokenValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface BatchValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    tokenCount: number;
    invalidCount: number;
}

export function validateToken(token: OrganizationalToken): TokenValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!token.tokenId) {
        errors.push("tokenId is required");
    } else if (!token.tokenId.startsWith("tok_")) {
        errors.push(`tokenId must start with 'tok_', got: "${token.tokenId}"`);
    }

    if (!token.tenantId) errors.push("tenantId is required");
    if (!token.tokenKind) errors.push("tokenKind is required");

    if (!token.transactionTime) {
        errors.push("transactionTime is required");
    } else if (isNaN(Date.parse(token.transactionTime))) {
        errors.push(`transactionTime is not a valid ISO-8601 date: "${token.transactionTime}"`);
    }

    if (!Array.isArray(token.sourceRefs) || token.sourceRefs.length === 0) {
        errors.push("sourceRefs must be a non-empty array — every token needs provenance");
    } else {
        for (const ref of token.sourceRefs) {
            if (!ref.evidenceId) errors.push("sourceRef is missing evidenceId");
            if (!ref.sourceSystem) errors.push("sourceRef is missing sourceSystem");
            if (!ref.sourceObjectId) errors.push("sourceRef is missing sourceObjectId");
        }
    }

    if (typeof token.confidence !== "number") {
        errors.push("confidence must be a number");
    } else if (!isFinite(token.confidence) || token.confidence < 0 || token.confidence > 1) {
        errors.push(`confidence must be 0–1, got: ${token.confidence}`);
    }

    if (!token.epistemicStatus) errors.push("epistemicStatus is required");
    if (!Array.isArray(token.visibility)) errors.push("visibility must be an array");
    if (!Array.isArray(token.actionScope)) errors.push("actionScope must be an array");
    if (!token.retentionClass) errors.push("retentionClass is required");

    // Warnings
    if (typeof token.confidence === "number" && isFinite(token.confidence)) {
        if (token.confidence < 0.4) {
            warnings.push(`very low confidence (${token.confidence.toFixed(2)}) — consider rejecting this token`);
        } else if (token.confidence < 0.6) {
            warnings.push(`low confidence (${token.confidence.toFixed(2)}) — review recommended`);
        }
    }

    if (!token.validTime) {
        warnings.push("validTime not set — no business date attached to this token");
    } else {
        if (token.validTime.from && isNaN(Date.parse(token.validTime.from))) {
            warnings.push(`validTime.from is not a valid ISO-8601 date: "${token.validTime.from}"`);
        }
        if (token.validTime.to && isNaN(Date.parse(token.validTime.to))) {
            warnings.push(`validTime.to is not a valid ISO-8601 date: "${token.validTime.to}"`);
        }
    }

    if (!token.payloadRef) {
        warnings.push("payloadRef not set — no link back to the source document payload");
    }

    return { valid: errors.length === 0, errors, warnings };
}

export function validateTokens(tokens: OrganizationalToken[]): BatchValidationResult {
    const allErrors: string[] = [];
    const allWarnings: string[] = [];
    let invalidCount = 0;

    const seen = new Map<string, number>();
    tokens.forEach((t, idx) => {
        if (!t.tokenId) return;
        const prev = seen.get(t.tokenId);
        if (prev !== undefined) {
            allErrors.push(`duplicate tokenId "${t.tokenId}" at index ${idx} (first seen at index ${prev})`);
        } else {
            seen.set(t.tokenId, idx);
        }
    });

    for (const token of tokens) {
        const result = validateToken(token);
        if (!result.valid) {
            invalidCount++;
            allErrors.push(...result.errors.map((e) => `[${token.tokenId ?? "UNKNOWN"}] ${e}`));
        }
        allWarnings.push(...result.warnings.map((w) => `[${token.tokenId ?? "UNKNOWN"}] ${w}`));
    }

    return {
        valid: allErrors.length === 0,
        errors: allErrors,
        warnings: allWarnings,
        tokenCount: tokens.length,
        invalidCount,
    };
}