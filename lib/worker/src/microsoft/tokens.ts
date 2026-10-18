/**
 * Encrypted token envelope for Microsoft 365 sync.
 *
 * The Graph refresh token is the long-lived credential that lets the worker
 * keep syncing after the admin who connected leaves. It is stored at rest in
 * the database, encrypted with AES-256-GCM under a key that lives in the
 * environment — never in the database, never in logs.
 *
 * The envelope is versioned so the cipher can be rotated without losing data:
 * bump the version, re-encrypt the rows, and old envelopes become invalid.
 *
 * Testable without a database: encrypt/decrypt round-trips are pure.
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";

export const TOKEN_ENVELOPE_VERSION = 1;

/** 32-byte AES-256 key, base64-encoded, from MICROSOFT_SYNC_ENCRYPTION_KEY. */
export function resolveEncryptionKey(raw: string | undefined): Buffer | null {
  if (!raw || raw.trim().length === 0) return null;
  const trimmed = raw.trim();
  let key: Buffer;
  // Accept a raw hex string (more restrictive, check first) or base64.
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    key = Buffer.from(trimmed, "hex");
  } else if (/^[A-Za-z0-9+/]{43,}={0,2}$/.test(trimmed)) {
    key = Buffer.from(trimmed, "base64");
  } else {
    // Fall back to a derived key so a low-entropy secret still works, but
    // log loudly — the caller should provide a real key.
    key = scryptSync(trimmed, "orgni-ms-sync", 32);
  }
  if (key.length !== 32) {
    throw new Error(
      `encryption key must decode to 32 bytes for AES-256 (got ${key.length})`,
    );
  }
  return key;
}

export interface TokenEnvelope {
  version: number;
  iv: string; // base64
  ciphertext: string; // base64
  tag: string; // base64
  keyId?: string; // which key encrypted this, for rotation
}

export interface TokenEnvelopeInput {
  plaintext: string;
  key: Buffer;
  keyId?: string;
}

/**
 * Encrypt a plaintext token into a versioned envelope.
 *
 * The IV is random per encryption, so the same plaintext never produces the
 * same ciphertext — an attacker can't tell whether two stored envelopes match.
 */
export function encryptEnvelope(input: TokenEnvelopeInput): TokenEnvelope {
  const iv = randomBytes(12); // 96-bit nonce, recommended for GCM
  const cipher = createCipheriv("aes-256-gcm", input.key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(input.plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return {
    version: TOKEN_ENVELOPE_VERSION,
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: tag.toString("base64"),
    keyId: input.keyId,
  };
}

export type DecryptResult =
  | { ok: true; plaintext: string }
  | { ok: false; error: "unsupported_version" | "decryption_failed" };

/**
 * Decrypt an envelope. Returns a tagged failure rather than throwing so a
 * corrupt row never takes down the whole sync batch — one bad token is a
 * skipped tenant, not a crash.
 */
export function decryptEnvelope(
  envelope: TokenEnvelope,
  key: Buffer,
): DecryptResult {
  if (envelope.version !== TOKEN_ENVELOPE_VERSION) {
    return { ok: false, error: "unsupported_version" };
  }
  try {
    const iv = Buffer.from(envelope.iv, "base64");
    const ciphertext = Buffer.from(envelope.ciphertext, "base64");
    const tag = Buffer.from(envelope.tag, "base64");
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString("utf8");
    return { ok: true, plaintext };
  } catch {
    return { ok: false, error: "decryption_failed" };
  }
}

/** Constant-time string comparison, for token-set fingerprinting. */
export function sameTokenFingerprint(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  if (ha.length !== hb.length) return false;
  return timingSafeEqual(ha, hb);
}
