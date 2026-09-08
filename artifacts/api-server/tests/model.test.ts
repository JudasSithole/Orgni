/**
 * Unit tests for the organizational-model aggregation (no server, no DB).
 *
 * The fixture mirrors two persisted ontology results for the same tenant: one
 * invoice naming "Acme Ltd" and "Globex", and a second document that names
 * "Acme Ltd" again — so the aggregation must group the two Acme mentions while
 * keeping both sources' provenance.
 */
import { describe, expect, it } from "vitest";

import {
  buildActivity,
  buildEntities,
  buildEntityDetail,
  buildExceptions,
  buildOverview,
  type ModelInput,
} from "../src/lib/model.js";

function fixture(): ModelInput {
  const t0 = new Date("2026-07-01T10:00:00Z");
  const t1 = new Date("2026-07-02T10:00:00Z");
  return {
    sources: [
      {
        sourceId: "src_2",
        filename: "contract.pdf",
        documentType: "CONTRACT",
        state: "COMPLETED",
        confidence: 0.9,
        errors: [],
        uploadedAt: t1,
      },
      {
        sourceId: "src_1",
        filename: "invoice.pdf",
        documentType: "INVOICE",
        state: "COMPLETED",
        confidence: 0.8,
        errors: [],
        uploadedAt: t0,
      },
      {
        sourceId: "src_3",
        filename: "broken.pdf",
        documentType: null,
        state: "FAILED",
        confidence: null,
        errors: ["unreadable"],
        uploadedAt: t0,
      },
    ],
    facts: [
      {
        sourceId: "src_1",
        result: {
          entities: [
            {
              entity_id: "e_acme_1",
              entity_type: "ORGANIZATION",
              name: "Acme Ltd",
            },
            {
              entity_id: "e_globex_1",
              entity_type: "ORGANIZATION",
              name: "Globex",
            },
          ],
          relationships: [
            {
              subject_ref: "e_acme_1",
              predicate: "BILLS",
              object_ref: "e_globex_1",
            },
          ],
          facts: [
            {
              fact_type: "INVOICE_AMOUNT",
              subject: "Acme Ltd",
              epistemic_status: "OBSERVED",
            },
            {
              fact_type: "OBLIGATION",
              subject: "Globex",
              epistemic_status: "ASSERTED",
            },
          ],
          conflicts: [],
          warnings: ["invoice_status_not_stated"],
          rejected: [],
        },
      },
      {
        sourceId: "src_2",
        result: {
          entities: [
            {
              entity_id: "e_acme_2",
              entity_type: "ORGANIZATION",
              name: "acme ltd",
            },
          ],
          relationships: [],
          facts: [
            {
              fact_type: "CONTRACT_PARTY",
              subject: "Acme Ltd",
              epistemic_status: "OBSERVED",
            },
          ],
          conflicts: [
            { conflict_type: "SCALAR_MISMATCH", detail: "two amounts" },
          ],
          warnings: [],
          rejected: ["contract_not_signed"],
        },
      },
    ],
    reviews: [
      {
        sourceId: "src_1",
        fieldPath: "amount",
        action: "CORRECT",
        reviewer: "you@org.com",
        createdAt: t1,
      },
    ],
  };
}

describe("model aggregation", () => {
  it("overview counts distinct entities, facts by status, and exceptions", () => {
    const o = buildOverview(fixture());
    expect(o.sources.total).toBe(3);
    expect(o.sources.byState).toEqual({ COMPLETED: 2, FAILED: 1 });
    // Acme (grouped across two sources) + Globex = 2 distinct.
    expect(o.entities).toBe(2);
    expect(o.relationships).toBe(1);
    expect(o.facts.total).toBe(3);
    expect(o.facts.byStatus).toEqual({ OBSERVED: 2, ASSERTED: 1 });
    // 1 conflict + 1 failed source.
    expect(o.exceptions).toBe(2);
    expect(o.reviews).toBe(1);
    expect(o.latestSources[0]!.sourceId).toBe("src_2");
  });

  it("groups same-named entities across sources by normalized name", () => {
    const entities = buildEntities(fixture());
    const acme = entities.find((e) => e.key === "ORGANIZATION:acme ltd");
    expect(acme).toBeDefined();
    expect(acme!.occurrences).toBe(2);
    expect(acme!.sources.map((s) => s.sourceId).sort()).toEqual([
      "src_1",
      "src_2",
    ]);
  });

  it("entity detail links facts (by name) and relationships (by ref)", () => {
    const detail = buildEntityDetail(fixture(), "ORGANIZATION:acme ltd");
    expect(detail).not.toBeNull();
    // INVOICE_AMOUNT (src_1) + CONTRACT_PARTY (src_2) name Acme as subject.
    expect(detail!.facts).toHaveLength(2);
    // The BILLS relationship references e_acme_1.
    expect(detail!.relationships).toHaveLength(1);
  });

  it("exceptions surface conflicts, rejections, warnings, and failed sources", () => {
    const ex = buildExceptions(fixture());
    expect(ex.conflicts).toHaveLength(1);
    expect(ex.rejected).toEqual([
      {
        reason: "contract_not_signed",
        source: expect.objectContaining({ sourceId: "src_2" }),
      },
    ]);
    expect(ex.warnings.map((w) => w.warning)).toEqual([
      "invoice_status_not_stated",
    ]);
    expect(ex.failedSources.map((s) => s.sourceId)).toEqual(["src_3"]);
  });

  it("activity merges source and review events newest-first", () => {
    const events = buildActivity(fixture());
    expect(events).toHaveLength(4); // 3 sources + 1 review
    // Newest first: t1 events before t0 events.
    expect(events[0]!.at.getTime()).toBeGreaterThanOrEqual(
      events[3]!.at.getTime(),
    );
    expect(events.some((e) => e.type === "REVIEW")).toBe(true);
  });

  it("returns null for an unknown entity key", () => {
    expect(buildEntityDetail(fixture(), "ORGANIZATION:nope")).toBeNull();
  });

  it("groups declared aliases under their canonical entity", () => {
    const input = fixture();
    input.facts[0]!.result["entities"] = [
      {
        entity_id: "supplier_master",
        entity_type: "ORGANIZATION",
        name: "Ubuntu Steelworks (Pty) Ltd",
        canonical_id: "SUP-001",
        alias_key: "ubuntusteelworks",
        aliases: ["Ubuntu Steel Works (Pty) Ltd", "Ubuntu Steelworks SA"],
      },
    ];
    input.facts[1]!.result["entities"] = [
      {
        entity_id: "supplier_invoice",
        entity_type: "ORGANIZATION",
        name: "Ubuntu Steelworks SA",
        alias_key: "ubuntusteelworks",
      },
    ];

    const entities = buildEntities(input);
    expect(entities).toHaveLength(1);
    expect(entities[0]!.key).toBe("CANONICAL:sup-001");
    expect(entities[0]!.occurrences).toBe(2);
  });

  it("promotes corroborated exception evidence across documents", () => {
    const input = fixture();
    for (const [index, fact] of input.facts.entries()) {
      fact.result["conflicts"] = [];
      fact.result["facts"] = [
        {
          fact_id: `exception_${index}`,
          fact_type: "EXCEPTION_EVIDENCE",
          subject: "short-delivery",
          scalar_value: {
            scenarioKey: "short-delivery",
            scenario: "Delivery short by four units",
          },
          epistemic_status: "OBSERVED",
        },
      ];
    }
    const exceptions = buildExceptions(input);
    expect(exceptions.conflicts).toHaveLength(1);
    expect(exceptions.conflicts[0]!.conflict).toMatchObject({
      conflict_type: "CROSS_DOCUMENT_EXCEPTION",
      scenario_key: "short-delivery",
    });
  });
});
