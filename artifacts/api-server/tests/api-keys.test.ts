/**
 * Unit tests for API-key helpers (no server, no DB).
 */
import { describe, expect, it } from "vitest";

import {
  generateApiKey,
  hashApiKey,
  looksLikeApiKey,
  API_KEY_PREFIX,
} from "../src/lib/api-keys.js";
import { canManageApiKeys } from "../src/routes/keys.js";

describe("api keys", () => {
  it("generates a prefixed key and stores only its hash + short prefix", () => {
    const { key, keyHash, keyPrefix } = generateApiKey();
    expect(key.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(keyPrefix.startsWith(API_KEY_PREFIX)).toBe(true);
    // Prefix reveals only a few chars of the secret.
    expect(keyPrefix.length).toBeLessThan(key.length);
    expect(key.startsWith(keyPrefix)).toBe(true);
    // The hash is the sha256 of the full key, never the key itself.
    expect(keyHash).toBe(hashApiKey(key));
    expect(keyHash).not.toContain(key.slice(API_KEY_PREFIX.length));
  });

  it("produces unique keys", () => {
    const a = generateApiKey().key;
    const b = generateApiKey().key;
    expect(a).not.toBe(b);
  });

  it("recognises a bearer value that is an API key", () => {
    expect(looksLikeApiKey("orgni_sk_abc123")).toBe(true);
    expect(looksLikeApiKey("eyJ...session.token")).toBe(false);
  });

  it("allows only human owners to manage tenant API keys", () => {
    const base = {
      tenantId: "tenant_acme",
      iat: 0,
      exp: 9e9,
    };
    expect(
      canManageApiKeys({
        principal: { ...base, sub: "owner@acme.com", roles: ["Owner"] },
      } as never),
    ).toBe(true);
    expect(
      canManageApiKeys({
        principal: { ...base, sub: "apikey:key_1", roles: ["Service"] },
      } as never),
    ).toBe(false);
    expect(
      canManageApiKeys({
        principal: { ...base, sub: "member@acme.com", roles: ["Member"] },
      } as never),
    ).toBe(false);
  });
});
