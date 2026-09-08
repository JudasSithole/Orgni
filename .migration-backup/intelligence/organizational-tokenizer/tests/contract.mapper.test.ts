import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mapContractToTokens } from "../src/mappings/contract.mapper.js";
import type { ContractExtraction } from "../src/envelopes/contract.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture<T>(name: string): T {
  return JSON.parse(readFileSync(resolve(__dirname, "fixtures", name), "utf8")) as T;
}

// Load base fixture and apply an explicit signature date to simulate confirmed execution
const baseClean = loadFixture<ContractExtraction>("contract.clean.json");
const cleanWithExecution: ContractExtraction = {
  ...baseClean,
  signedDate: { value: "2026-07-01", confidence: 0.95 }
};

describe("mapContractToTokens — complete contract (Confirmed Execution)", () => {
  const tokens = mapContractToTokens(cleanWithExecution);

  it("emits 5 tokens: CONTRACT_AGREEMENT + CONTRACT_EXECUTED + RELATION + 2 POLICY when execution is confirmed", () => {
    expect(tokens).toHaveLength(5);
  });

  it("always emits a CONTRACT_AGREEMENT STATE fact carrying the terms", () => {
    const t = tokens.find((t) => t.eventType === "CONTRACT_AGREEMENT");
    expect(t).toBeDefined();
    expect(t!.tokenKind).toBe("STATE");
    const sv = t!.scalarValue as Record<string, unknown>;
    expect(sv["contractType"]).toBe("SERVICE_AGREEMENT");
    expect(sv["executionStatus"]).toBe("EXECUTED");
    expect(Array.isArray(sv["parties"])).toBe(true);
  });

  it("all tokenIds unique and start with tok_", () => {
    const ids = tokens.map((t) => t.tokenId);
    expect(new Set(ids).size).toBe(ids.length);
    ids.forEach((id) => expect(id).toMatch(/^tok_/));
  });

  it("CONTRACT_EXECUTED is an EVENT with contractType and parties", () => {
    const t = tokens.find((t) => t.eventType === "CONTRACT_EXECUTED");
    expect(t).toBeDefined();
    expect(t!.tokenKind).toBe("EVENT");
    const sv = t!.scalarValue as Record<string, unknown>;
    expect(sv["contractType"]).toBe("SERVICE_AGREEMENT");
  });

  it("includes page or section evidence for every generated contract token", () => {
    tokens.forEach((t) => {
      expect(t.sourceRefs[0].locator).toBeDefined();
      expect(typeof t.sourceRefs[0].locator?.page).toBe("number");
      expect(typeof t.sourceRefs[0].locator?.section).toBe("string");
    });
  });

  it("emits 1 CONTRACT_COUNTERPARTY RELATION token", () => {
    const rels = tokens.filter((t) => t.tokenKind === "RELATION");
    expect(rels).toHaveLength(1);
    expect(rels[0].predicate).toBe("CONTRACT_COUNTERPARTY");
  });
});

describe("mapContractToTokens — Unconfirmed Execution / Missing Optional Clauses", () => {
  it("does NOT emit a CONTRACT_EXECUTED token when signature / execution flag is completely absent", () => {
    const unconfirmedPayload: ContractExtraction = {
      ...baseClean,
      signedDate: undefined // Strip signature confirmation fields to verify enforcement
    };
    const tokens = mapContractToTokens(unconfirmedPayload);
    expect(tokens.find((t) => t.eventType === "CONTRACT_EXECUTED")).toBeUndefined();
  });

  it("still produces a meaningful CONTRACT_AGREEMENT fact (NOT_EXECUTED) when unsigned with no optional clauses", () => {
    const strippedPayload: ContractExtraction = {
      ...baseClean,
      signedDate: undefined,
      executionStatus: undefined,
      terminationClause: undefined,
      confidentialityClause: undefined,
    };
    const tokens = mapContractToTokens(strippedPayload);
    // CONTRACT_AGREEMENT (STATE) + CONTRACT_COUNTERPARTY (RELATION) — no bare
    // single-relationship output any more.
    expect(tokens).toHaveLength(2);
    const agreement = tokens.find((t) => t.eventType === "CONTRACT_AGREEMENT");
    expect(agreement).toBeDefined();
    expect((agreement!.scalarValue as Record<string, unknown>)["executionStatus"]).toBe(
      "NOT_EXECUTED",
    );
    // Unsigned must never be executed.
    expect(tokens.find((t) => t.eventType === "CONTRACT_EXECUTED")).toBeUndefined();
  });

  it("emits a CONTRACT_OBLIGATION policy for each extracted obligation", () => {
    const withObligations: ContractExtraction = {
      ...baseClean,
      signedDate: undefined,
      executionStatus: undefined,
      obligations: [
        { value: "The Provider shall deliver the services.", confidence: 0.8 },
        { value: "The Client shall pay within 30 days.", confidence: 0.8 },
      ],
    };
    const tokens = mapContractToTokens(withObligations);
    const obligations = tokens.filter((t) => t.eventType === "CONTRACT_OBLIGATION");
    expect(obligations).toHaveLength(2);
    obligations.forEach((t) => expect(t.tokenKind).toBe("POLICY"));
  });
});
