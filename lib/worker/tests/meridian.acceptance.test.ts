import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { tokenizeEnvelope } from "../src/phase1/index.js";
import type { NormalizedEnvelope } from "../src/envelope/types.js";

const fixture = join(
  dirname(fileURLToPath(import.meta.url)),
  "fixtures",
  "meridian",
);
const groundTruth = JSON.parse(
  readFileSync(join(fixture, "ground_truth.json"), "utf8"),
) as {
  entities: Array<{ id: string; name: string; aliases?: string[] }>;
  relationships: Array<{ type: string; from: string; to: string }>;
  facts: Array<{
    id: string;
    type: string;
    subject: string;
    value: unknown;
  }>;
  policies: Array<{ id: string; rule: string }>;
  conflicts: Array<{ id: string; scenario: string }>;
};
const envelopes = JSON.parse(
  readFileSync(join(fixture, "normalized-envelopes.json"), "utf8"),
) as NormalizedEnvelope[];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/\bfictional\b/g, "")
    .replace(/\s+(?:\(?pty\)?\s+ltd|limited|ltd|cc|b\.?v\.?|sa)$/i, "")
    .replace(/[^a-z0-9]/g, "");

function run() {
  return envelopes.map((envelope) => ({
    filename: envelope.metadata.filename,
    ...tokenizeEnvelope(envelope),
  }));
}

describe("Meridian Phase 1 acceptance corpus", () => {
  it("processes all 40 normalized documents without crashing", () => {
    const results = run();
    expect(results).toHaveLength(40);
    expect(results.every((result) => Array.isArray(result.tokens))).toBe(true);
  });

  it("resolves at least 90% of canonical ground-truth entities", () => {
    const actual = run()
      .flatMap((result) => result.tokens)
      .filter((token) => token.tokenKind === "ENTITY");
    const detected = groundTruth.entities.filter((expected) =>
      [expected.name, ...(expected.aliases ?? [])].some((candidate) =>
        actual.some(
          (token) =>
            normalize(String(token.subjectId ?? "")) === normalize(candidate) ||
            (token.scalarValue as { canonicalId?: string } | undefined)
              ?.canonicalId === expected.id,
        ),
      ),
    );
    expect(
      detected.length / groundTruth.entities.length,
    ).toBeGreaterThanOrEqual(0.9);
  });

  it("creates the exact evidence-backed relationship set", () => {
    const actual = run()
      .flatMap((result) => result.tokens)
      .filter((token) => token.tokenKind === "RELATION")
      .map((token) => {
        const value = token.scalarValue as {
          subjectCanonicalId?: string;
          objectCanonicalId?: string;
        };
        return `${token.predicate}|${value.subjectCanonicalId}|${value.objectCanonicalId}`;
      });
    const expected = groundTruth.relationships.map(
      (relationship) =>
        `${relationship.type}|${relationship.from}|${relationship.to}`,
    );
    expect(new Set(actual)).toEqual(new Set(expected));
    expect(actual).toHaveLength(expected.length);
  });

  it("normalizes all source-grounded business facts", () => {
    const expected = groundTruth.facts.filter(
      (fact) => fact.type !== "SYNTHETIC_OPERATIONAL_FACT",
    );
    const actual = run().flatMap((result) =>
      result.tokens.filter(
        (token) => token.tokenKind === "STATE" || token.tokenKind === "EVENT",
      ),
    );
    const scalar = (value: unknown) =>
      typeof value === "object" && value !== null && "value" in value
        ? (value as { value: unknown }).value
        : value;
    const detected = expected.filter((fact) =>
      actual.some(
        (token) =>
          token.eventType === fact.type &&
          token.subjectId === fact.subject &&
          String(scalar(token.scalarValue)) === String(fact.value),
      ),
    );
    expect(detected.map((fact) => fact.id)).toEqual(
      expected.map((fact) => fact.id),
    );
  });

  it("extracts the 18 normalized policies and all 17 exception scenarios", () => {
    const tokens = run().flatMap((result) => result.tokens);
    const policies = tokens
      .filter((token) => token.eventType === "ORGANIZATIONAL_POLICY")
      .map(
        (token) =>
          (token.scalarValue as { rule?: string } | undefined)?.rule ?? "",
      );
    expect(new Set(policies)).toEqual(
      new Set(groundTruth.policies.map((policy) => policy.rule)),
    );

    const scenarios = new Set(
      tokens
        .filter((token) => token.eventType === "EXCEPTION_EVIDENCE")
        .map((token) => (token.scalarValue as { scenario?: string }).scenario),
    );
    expect(scenarios).toEqual(
      new Set(groundTruth.conflicts.map((conflict) => conflict.scenario)),
    );
  });

  it("preserves provenance and never invents a settled payment", () => {
    const tokens = run().flatMap((result) => result.tokens);
    for (const token of tokens) {
      expect(token.sourceRefs.length).toBeGreaterThan(0);
      expect(token.confidence).toBeGreaterThanOrEqual(0);
      expect(token.confidence).toBeLessThanOrEqual(1);
    }
    const paymentStatuses = tokens.flatMap((token) => {
      const value = token.scalarValue;
      return typeof value === "object" && value !== null && "status" in value
        ? [String((value as { status: unknown }).status)]
        : [];
    });
    expect(paymentStatuses).not.toContain("SETTLED");
    expect(paymentStatuses).toContain("PENDING_VERIFICATION");
  });
});
