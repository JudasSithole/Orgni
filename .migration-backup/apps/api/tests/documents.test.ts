/**
 * API upload endpoint tests.
 *
 * Document Intelligence is replaced by a local stub HTTP server, but everything
 * downstream is the real thing: the real ingestion pipeline, real envelope
 * validation, and the real tokenizer. So these tests exercise the genuine
 * endpoint → pipeline → tokens path, only standing in for the Python service.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";

const INVOICE_ENVELOPE = {
  source_id: "src_test",
  source_type: "UPLOAD",
  document_type: "INVOICE",
  content: { text: "TAX INVOICE ...", language: "en" },
  extracted_fields: {
    invoiceNumber: {
      value: "INV-1",
      confidence: 0.9,
      method: "RULE_MATCH",
      page: 1,
    },
    invoiceDate: {
      value: "2024-03-15",
      confidence: 0.9,
      method: "RULE_MATCH",
      page: 1,
    },
    vendorName: {
      value: "Olyxee AI (Pty) Ltd",
      confidence: 0.8,
      method: "RULE_MATCH",
      page: 1,
    },
    buyerName: {
      value: "Clover Retail Group",
      confidence: 0.8,
      method: "RULE_MATCH",
      page: 1,
    },
    totalAmount: {
      value: 13225,
      confidence: 0.9,
      method: "RULE_MATCH",
      page: 1,
    },
    currency: { value: "ZAR", confidence: 0.9, method: "RULE_MATCH", page: 1 },
  },
  tables: [],
  metadata: {
    filename: "invoice.pdf",
    mime_type: "application/pdf",
    checksum: "deadbeef",
    tenant_id: "tenant_olyxee",
  },
  evidence_locations: [],
  confidence: 0.88,
  warnings: [],
  schema_version: "0.1.0",
  extraction_status: "COMPLETE",
};

// Records the last multipart body the stub received, so tests can assert what
// the API forwarded to Document Intelligence.
let lastDiBody = "";
// Records the tokens the API forwarded to the ontology.
let lastOntologyTokens: unknown[] = [];

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}

let diServer: Server;
let ontologyServer: Server;
let apiServer: Server;
let baseUrl: string;

beforeAll(async () => {
  // 1. Stub Document Intelligence. Faithfully echoes the source_id/tenant_id it
  //    was given (as the real service does), so token ids are unique per upload.
  await new Promise<void>((resolve) => {
    diServer = createServer(async (req, res) => {
      lastDiBody = await readBody(req);
      const sourceId =
        /name="source_id"\r?\n\r?\n([^\r\n]+)/.exec(lastDiBody)?.[1] ??
        "src_test";
      const tenantId =
        /name="tenant_id"\r?\n\r?\n([^\r\n]+)/.exec(lastDiBody)?.[1] ??
        "tenant_olyxee";
      const envelope = {
        ...INVOICE_ENVELOPE,
        ...(lastDiBody.includes('filename="empty.txt"')
          ? {
              document_type: "UNKNOWN",
              content: { text: "", language: "und" },
              extracted_fields: {},
              confidence: 0,
              warnings: ["no_text_extracted"],
              extraction_status: "LOW_CONFIDENCE",
            }
          : {}),
        source_id: sourceId,
        metadata: {
          ...INVOICE_ENVELOPE.metadata,
          tenant_id: tenantId,
          checksum: sourceId,
        },
      };
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify(envelope));
    });
    diServer.listen(0, resolve);
  });
  const diPort = (diServer.address() as AddressInfo).port;

  // 2. Stub Ontology: echoes a minimal reviewable-facts result and records the
  //    tokens it was given (to prove the API forwards real tokenizer output).
  await new Promise<void>((resolve) => {
    ontologyServer = createServer(async (req, res) => {
      const body = await readBody(req);
      lastOntologyTokens = JSON.parse(body || "{}").tokens ?? [];
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          tenant_id: "tenant_olyxee",
          schema_version: "0.1.0",
          entities: [{ name: "Olyxee AI (Pty) Ltd" }],
          relationships: [],
          facts: lastOntologyTokens.map((t) => ({
            fact_id: `fact_${(t as { tokenId: string }).tokenId}`,
          })),
          conflicts: [],
          warnings: [],
          rejected: [],
        }),
      );
    });
    ontologyServer.listen(0, resolve);
  });
  const ontPort = (ontologyServer.address() as AddressInfo).port;

  // 3. Point config at the stubs BEFORE importing the app (config loads at import).
  process.env["NODE_ENV"] = "test";
  process.env["DOCUMENT_INTELLIGENCE_URL"] = `http://127.0.0.1:${diPort}`;
  process.env["ONTOLOGY_URL"] = `http://127.0.0.1:${ontPort}`;
  // DATABASE_URL, when present, enables persistence + retrieval assertions.

  const { default: app } = await import("../src/app.js");
  await new Promise<void>((resolve) => {
    apiServer = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${(apiServer.address() as AddressInfo).port}`;
}, 60_000);

afterAll(() => {
  apiServer?.close();
  diServer?.close();
  ontologyServer?.close();
});

function form(bytes: Uint8Array, filename: string, type: string): FormData {
  const body = new FormData();
  body.append("file", new Blob([bytes], { type }), filename);
  return body;
}

describe("POST /api/documents", () => {
  it("returns evidence-backed tokens for an invoice", async () => {
    const res = await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      headers: { "x-tenant-id": "tenant_olyxee" },
      body: form(
        new TextEncoder().encode("%PDF-1.4 fake"),
        "invoice.pdf",
        "application/pdf",
      ),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.schemaVersion).toBe("0.1.0");
    expect(body.documentType).toBe("INVOICE");
    expect(Array.isArray(body.tokens)).toBe(true);
    expect(body.tokens.length).toBeGreaterThan(0);
    for (const token of body.tokens) {
      expect(token.tenantId).toBe("tenant_olyxee");
      expect(token.sourceRefs.length).toBeGreaterThan(0);
    }
  });

  it("rejects an unauthenticated request", async () => {
    const res = await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      body: form(
        new TextEncoder().encode("x"),
        "invoice.pdf",
        "application/pdf",
      ),
    });
    expect(res.status).toBe(401);
    expect((await res.json()).error).toBe("unauthenticated");
  });

  it("logs in and uses the session token as the tenant", async () => {
    const login = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "demo@olyxee.com",
        organization: "Clover Retail",
      }),
    });
    expect(login.status).toBe(200);
    const { token, principal } = await login.json();
    expect(principal.tenantId).toBe("tenant_clover-retail");

    // A Bearer session is accepted and drives the tenant.
    const up = await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: form(
        new TextEncoder().encode("%PDF-1.4 fake"),
        "invoice.pdf",
        "application/pdf",
      ),
    });
    expect(up.status).toBe(200);
    const body = await up.json();
    for (const t of body.tokens)
      expect(t.tenantId).toBe("tenant_clover-retail");

    // A garbage token is rejected.
    const bad = await fetch(`${baseUrl}/api/documents`, {
      headers: { authorization: "Bearer not.a.valid.token" },
    });
    expect(bad.status).toBe(401);
  });

  it("rejects a request with no file", async () => {
    const res = await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      headers: { "x-tenant-id": "tenant_olyxee" },
      body: new FormData(),
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("missing_file");
  });

  it("returns 422 with warnings for an unsupported type (controlled failure)", async () => {
    // Ingestion rejects the type before Document Intelligence is called.
    const res = await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      headers: { "x-tenant-id": "tenant_olyxee" },
      body: form(new TextEncoder().encode("PK"), "a.zip", "application/zip"),
    });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.state).toBe("FAILED");
    expect(body.tokens).toHaveLength(0);
    expect(JSON.stringify(body.errors)).toContain("unsupported_mime_type");
  });

  it("maps tokens into reviewable facts via the ontology", async () => {
    const res = await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      headers: { "x-tenant-id": "tenant_olyxee" },
      body: form(
        new TextEncoder().encode("%PDF-1.4 fake"),
        "invoice.pdf",
        "application/pdf",
      ),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    // Facts are present and the ontology received the real tokenizer tokens.
    expect(body.facts).not.toBeNull();
    expect(body.facts.schema_version).toBe("0.1.0");
    expect(Array.isArray(body.facts.facts)).toBe(true);
    expect(lastOntologyTokens.length).toBe(body.tokens.length);
    expect(lastOntologyTokens.length).toBeGreaterThan(0);
  });

  it.runIf(process.env["DATABASE_URL"])(
    "persists the result and serves it back for review",
    async () => {
      const up = await fetch(`${baseUrl}/api/documents`, {
        method: "POST",
        headers: { "x-tenant-id": "tenant_persist" },
        body: form(
          new TextEncoder().encode(`%PDF-1.4 unique-${Date.now()}`),
          "invoice.pdf",
          "application/pdf",
        ),
      });
      const uploaded = await up.json();
      expect(up.status).toBe(200);
      expect(uploaded.warnings.join()).not.toContain("persistence_unavailable");
      const sourceId = uploaded.sourceId;

      // Retrieve it back through the API — proves it survived the request.
      const get = await fetch(`${baseUrl}/api/documents/${sourceId}`, {
        headers: { "x-tenant-id": "tenant_persist" },
      });
      expect(get.status).toBe(200);
      const doc = await get.json();
      expect(doc.source.sourceId).toBe(sourceId);
      expect(doc.tokens.length).toBeGreaterThan(0);
      expect(doc.facts).not.toBeNull();

      // A different tenant must not see it.
      const cross = await fetch(`${baseUrl}/api/documents/${sourceId}`, {
        headers: { "x-tenant-id": "tenant_other" },
      });
      expect(cross.status).toBe(404);
    },
  );

  it.runIf(process.env["DATABASE_URL"])(
    "replays a completed zero-token document as HTTP 200",
    async () => {
      const bytes = new TextEncoder().encode(`empty-note-${Date.now()}`);
      const upload = () =>
        fetch(`${baseUrl}/api/documents`, {
          method: "POST",
          headers: { "x-tenant-id": "tenant_zero_idem" },
          body: form(bytes, "empty.txt", "text/plain"),
        });
      const firstResponse = await upload();
      const first = await firstResponse.json();
      const secondResponse = await upload();
      const second = await secondResponse.json();

      expect(firstResponse.status).toBe(200);
      expect(first.tokens).toHaveLength(0);
      expect(secondResponse.status).toBe(200);
      expect(second.sourceId).toBe(first.sourceId);
      expect(second.tokens).toHaveLength(0);
      expect(second.warnings.join()).toContain("idempotent_replay");
    },
  );

  it.runIf(process.env["DATABASE_URL"])(
    "is idempotent: re-uploading the same bytes returns the stored source",
    async () => {
      const bytes = new TextEncoder().encode(`%PDF-1.4 idem-${Date.now()}`);
      const first = await (
        await fetch(`${baseUrl}/api/documents`, {
          method: "POST",
          headers: { "x-tenant-id": "tenant_idem" },
          body: form(bytes, "invoice.pdf", "application/pdf"),
        })
      ).json();
      const second = await (
        await fetch(`${baseUrl}/api/documents`, {
          method: "POST",
          headers: { "x-tenant-id": "tenant_idem" },
          body: form(bytes, "invoice.pdf", "application/pdf"),
        })
      ).json();
      expect(second.sourceId).toBe(first.sourceId);
      expect(second.warnings.join()).toContain("idempotent_replay");
    },
  );

  it("forwards the tenant to Document Intelligence", async () => {
    await fetch(`${baseUrl}/api/documents`, {
      method: "POST",
      headers: { "x-tenant-id": "tenant_acme" },
      body: form(
        new TextEncoder().encode("%PDF-1.4 fake"),
        "invoice.pdf",
        "application/pdf",
      ),
    });
    // The multipart body the API forwarded carries the tenant.
    expect(lastDiBody).toContain("tenant_acme");
  });
});
