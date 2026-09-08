/**
 * Unit tests for the dev-mode session token (no server, no DB).
 */
import { describe, expect, it } from "vitest";

import { issueToken, verifyToken, tenantIdFromOrg } from "../src/lib/auth.js";
import { resolveAuthSecret } from "../src/lib/config.js";

const SECRET = "test-secret";

describe("session token", () => {
  it("issues a token that verifies back to the same principal", () => {
    const { token, principal } = issueToken(
      { email: "a@b.com", tenantId: "tenant_acme", roles: ["Owner"] },
      SECRET,
    );
    const verified = verifyToken(token, SECRET);
    expect(verified).not.toBeNull();
    expect(verified!.sub).toBe("a@b.com");
    expect(verified!.tenantId).toBe("tenant_acme");
    expect(principal.tenantId).toBe("tenant_acme");
  });

  it("rejects a token signed with a different secret", () => {
    const { token } = issueToken({ email: "a@b.com", tenantId: "t" }, SECRET);
    expect(verifyToken(token, "other-secret")).toBeNull();
  });

  it("rejects a tampered body", () => {
    const { token } = issueToken({ email: "a@b.com", tenantId: "t" }, SECRET);
    const [, sig] = token.split(".");
    const forged = `${Buffer.from(
      JSON.stringify({ sub: "x", tenantId: "tenant_evil", exp: 9e9 }),
    ).toString("base64url")}.${sig}`;
    expect(verifyToken(forged, SECRET)).toBeNull();
  });

  it("rejects an expired token", () => {
    const { token } = issueToken(
      { email: "a@b.com", tenantId: "t" },
      SECRET,
      -1, // already expired
    );
    expect(verifyToken(token, SECRET)).toBeNull();
  });

  it("rejects malformed tokens", () => {
    expect(verifyToken("nonsense", SECRET)).toBeNull();
    expect(verifyToken("a.b.c", SECRET)).toBeNull();
    expect(verifyToken("", SECRET)).toBeNull();
  });

  it("derives a stable tenant id from an organization name", () => {
    expect(tenantIdFromOrg("Clover Retail")).toBe("tenant_clover-retail");
    expect(tenantIdFromOrg("  Acme, Inc.  ")).toBe("tenant_acme-inc");
    expect(tenantIdFromOrg("")).toBe("tenant_default");
  });

  it("requires the Replit session secret in production", () => {
    expect(() =>
      resolveAuthSecret({
        NODE_ENV: "production",
        PORT: 8080,
        LOG_LEVEL: "info",
        MAX_UPLOAD_BYTES: 20 * 1024 * 1024,
      }),
    ).toThrow(/SESSION_SECRET/);
  });

  it("does not accept the known development secret in production", () => {
    const productionSecret = "a-secure-production-session-secret-1234";
    const { token } = issueToken(
      { email: "a@b.com", tenantId: "tenant_acme" },
      "dev-only-insecure-secret-change-me",
    );
    expect(verifyToken(token, productionSecret)).toBeNull();
  });
});
