/**
 * Client for the Python Organizational Ontology service.
 *
 * Sends the tokenizer's real OrganizationalToken[] and returns the reviewable
 * fact result. Transport errors are thrown so the caller decides how to degrade;
 * a 422 (invalid tokens) is surfaced as a structured error rather than throwing.
 */
import type { OrganizationalToken } from "@workspace/contracts";

export interface OntologyResult {
  tenant_id: string | null;
  schema_version: "0.1.0";
  entities: unknown[];
  relationships: unknown[];
  facts: unknown[];
  conflicts: unknown[];
  warnings: string[];
  rejected: string[];
}

export interface OntologyClient {
  toFacts(tokens: OrganizationalToken[]): Promise<OntologyResult>;
}

export function createOntologyClient(config: {
  baseUrl: string;
  timeoutMs?: number;
}): OntologyClient {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const timeoutMs = config.timeoutMs ?? 15_000;

  return {
    async toFacts(tokens) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(`${baseUrl}/v1/facts`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ tokens }),
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(
            `ontology service returned ${response.status} ${response.statusText}`,
          );
        }
        return (await response.json()) as OntologyResult;
      } finally {
        clearTimeout(timer);
      }
    },
  };
}
