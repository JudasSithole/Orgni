import { describe, it, expect, vi } from "vitest";
import { createMemorySyncStore } from "../src/microsoft/store";
import { runMicrosoftSync } from "../src/microsoft/sync";
import {
  encryptEnvelope,
  decryptEnvelope,
  resolveEncryptionKey,
  sameTokenFingerprint,
  TOKEN_ENVELOPE_VERSION,
} from "../src/microsoft/tokens";
import { createGraphClient } from "../src/microsoft/graph";

const base64Key = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
const keyBuffer = resolveEncryptionKey(base64Key)!;

const logger = (level: "info" | "warn" | "error", msg: string, ctx?: Record<string, unknown>) => {
  console[level](`[microsoft-sync] ${msg}`, ctx ?? {});
};

function mockFetch(jsonBody: any, status = 200, ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => jsonBody,
    text: async () => JSON.stringify(jsonBody ?? {}),
  });
}

describe("tokens.ts", () => {
  it("encrypts and decrypts a round-trip", () => {
    const env = encryptEnvelope({ plaintext: "secret", key: keyBuffer });
    expect(env.version).toBe(TOKEN_ENVELOPE_VERSION);
    const out = decryptEnvelope(env, keyBuffer);
    if (!out.ok) throw new Error(out.error);
    expect(out.plaintext).toBe("secret");
  });

  it("fails with wrong key", () => {
    const env = encryptEnvelope({ plaintext: "secret", key: keyBuffer });
    const wrong = resolveEncryptionKey("BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=")!;
    const out = decryptEnvelope(env, wrong);
    expect(out.ok).toBe(false);
    expect(out.error).toBe("decryption_failed");
  });

  it("rejects unsupported version", () => {
    const out = decryptEnvelope(
      { version: 99, iv: "", ciphertext: "", tag: "", keyId: "k" } as any,
      keyBuffer,
    );
    expect(out.ok).toBe(false);
    expect(out.error).toBe("unsupported_version");
  });

  it("sameTokenFingerprint is true for equal", () => {
    expect(sameTokenFingerprint("deadbeef", "deadbeef")).toBe(true);
  });

  it("sameTokenFingerprint is false for different", () => {
    expect(sameTokenFingerprint("aaaa", "bbbb")).toBe(false);
  });

  it("resolveEncryptionKey accepts base64", () => {
    const k = resolveEncryptionKey(base64Key);
    expect(k).not.toBeNull();
    expect(k!.length).toBe(32);
  });

  it("resolveEncryptionKey accepts hex", () => {
    const hex = Buffer.alloc(32).fill(0xab).toString("hex");
    const k = resolveEncryptionKey(hex);
    expect(k).not.toBeNull();
    expect(k!.length).toBe(32);
  });

  it("resolveEncryptionKey derives fallback for short input", () => {
    const k = resolveEncryptionKey("short");
    expect(k).not.toBeNull();
    expect(k!.length).toBe(32);
  });

  it("resolveEncryptionKey returns null for empty", () => {
    expect(resolveEncryptionKey("")).toBeNull();
    expect(resolveEncryptionKey(undefined)).toBeNull();
  });
});

describe("store.ts memory store", () => {
  it("round-trips envelopes and cursors", async () => {
    const store = createMemorySyncStore();
    const env = { version: 1, iv: "iv", ciphertext: "ct", tag: "tag", keyId: "k1" };
    await store.saveTokenEnvelope("t1", env);
    const got = await store.getTokenEnvelope("t1");
    expect(got).toEqual(env);
    await store.saveCursor("t1", { deltaLink: "link1", tokenFingerprint: "fp1", updatedAt: new Date().toISOString() });
    const cur = await store.getCursor("t1");
    expect(cur?.deltaLink).toBe("link1");
    expect(cur?.tokenFingerprint).toBe("fp1");
  });
});

describe("graph.ts", () => {
  it("exchangeToken success", async () => {
    const fetch = mockFetch({ access_token: "at", refresh_token: "rt", expires_in: 3600 });
    const client = createGraphClient(fetch as any);
    const res = await client.exchangeToken({
      tenantId: "t",
      clientId: "c",
      clientSecret: "s",
      grantType: "refresh_token",
      refreshToken: "old-rt",
    });
    if (!res.ok) throw new Error(res.error);
    expect(res.value.accessToken).toBe("at");
    expect(fetch).toHaveBeenCalled();
  });

  it("exchangeToken failure", async () => {
    const fetch = mockFetch({ error: "invalid_grant" }, 400, false);
    const client = createGraphClient(fetch as any);
    const res = await client.exchangeToken({
      tenantId: "t",
      clientId: "c",
      clientSecret: "s",
      grantType: "refresh_token",
      refreshToken: "bad",
    });
    expect(res.ok).toBe(false);
  });

  it("listDriveChanges returns delta page", async () => {
    const fetch = mockFetch({ value: [{ id: "i1", name: "a.txt" }], "@odata.deltaLink": "link1" });
    const client = createGraphClient(fetch as any);
    const res = await client.listDriveChanges("d1", null, "at");
    if (!res.ok) throw new Error(res.error);
    expect(res.items.length).toBe(1);
    expect(res.deltaLink).toBe("link1");
  });

  it("listDriveChanges surfaces error", async () => {
    const fetch = mockFetch({ error: { message: "boom" } }, 500, false);
    const client = createGraphClient(fetch as any);
    const res = await client.listDriveChanges("d1", null, "at");
    expect(res.ok).toBe(false);
  });
});

describe("sync.ts runMicrosoftSync", () => {
  it("skips when no envelope", async () => {
    const store = createMemorySyncStore();
    const fetch = mockFetch({});
    const client = createGraphClient(fetch as any);
    const res = await runMicrosoftSync("t1", {
      driveId: "d1",
      graph: client,
      store,
      encryptionKey: base64Key,
      ingest: async () => ({ ok: true }),
      logger,
    });
    expect(res.itemsProcessed).toBe(0);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("persists token and cursor on success", async () => {
    const store = createMemorySyncStore();
    const env = encryptEnvelope({ plaintext: JSON.stringify({ refreshToken: "rt" }), key: keyBuffer });
    await store.saveTokenEnvelope("t1", env);
    const fetch = mockFetch({ access_token: "at", refresh_token: "rt2", expires_in: 3600 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: "at", refresh_token: "rt2", expires_in: 3600 }), text: async () => "{}" })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ value: [], "@odata.deltaLink": "link1" }), text: async () => "{}" });
    const client = createGraphClient(fetch as any);
    let ingested: any[] = [];
    const res = await runMicrosoftSync("t1", {
      driveId: "d1",
      graph: client,
      store,
      encryptionKey: base64Key,
      ingest: async (_tenantId, item) => { ingested.push(item); return { ok: true }; },
      logger,
    });
    expect(res.itemsProcessed).toBe(0);
    expect(res.itemsFailed).toBe(0);
    const cur = await store.getCursor("t1");
    expect(cur?.deltaLink).toBe("link1");
  });

  it("isolates per-item failures", async () => {
    const store = createMemorySyncStore();
    const env = encryptEnvelope({ plaintext: JSON.stringify({ refreshToken: "rt" }), key: keyBuffer });
    await store.saveTokenEnvelope("t1", env);
    const fetch = mockFetch({ access_token: "at", refresh_token: "rt2", expires_in: 3600 })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ access_token: "at", refresh_token: "rt2", expires_in: 3600 }), text: async () => "{}" })
      .mockResolvedValue({ ok: true, status: 200, json: async () => ({ value: [{ id: "i1", name: "a.txt" }, { id: "i2", name: "b.txt" }], "@odata.deltaLink": "link1" }), text: async () => "{}" });
    const client = createGraphClient(fetch as any);
    let ingested: any[] = [];
    const res = await runMicrosoftSync("t1", {
      driveId: "d1",
      graph: client,
      store,
      encryptionKey: base64Key,
      ingest: async (_tenantId, item) => {
        if (item.id === "i1") throw new Error("boom");
        ingested.push(item);
        return { ok: true };
      },
      logger,
    });
    expect(res.itemsFailed).toBe(1);
    expect(ingested.length).toBe(1);
    expect(ingested[0].id).toBe("i2");
  });
});
