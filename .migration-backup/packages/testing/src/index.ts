import { randomUUID } from "node:crypto";
import type { CanonicalEvent, EvidenceReference } from "@workspace/contracts";
import { buildCanonicalEvent } from "@workspace/contracts";

/**
 * Shared testing utilities: deterministic-enough fixture builders for the
 * core domain objects, so app tests don't hand-roll them.
 */

export function testId(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}

export function makeEvidenceRef(
  overrides: Partial<EvidenceReference> = {},
): EvidenceReference {
  return {
    evidenceId: testId("ev"),
    sourceSystem: "test",
    sourceObjectId: testId("obj"),
    ...overrides,
  };
}

export function makeCanonicalEvent(
  overrides: Partial<CanonicalEvent> = {},
): CanonicalEvent {
  return {
    ...buildCanonicalEvent({
      eventId: testId("evt"),
      tenantId: overrides.tenantId ?? "tenant_test",
      eventType: overrides.eventType ?? "DocumentReceived",
    }),
    ...overrides,
  };
}
