/**
 * API-key helpers.
 *
 * A key looks like `orgni_sk_<40 hex chars>`. We store only its SHA-256 hash
 * and a short prefix; the plaintext is returned to the caller once, at creation.
 */
import { randomBytes, createHash } from "node:crypto";

export const API_KEY_PREFIX = "orgni_sk_";

/** Generate a new key. Returns the plaintext (show once) and its stored form. */
export function generateApiKey(): {
  key: string;
  keyHash: string;
  keyPrefix: string;
} {
  const secret = randomBytes(24).toString("hex");
  const key = `${API_KEY_PREFIX}${secret}`;
  return {
    key,
    keyHash: hashApiKey(key),
    // Enough to recognise a key in a list without revealing it.
    keyPrefix: key.slice(0, API_KEY_PREFIX.length + 6),
  };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function looksLikeApiKey(token: string): boolean {
  return token.startsWith(API_KEY_PREFIX);
}
