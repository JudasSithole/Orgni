"use strict";
// SyncStore: persisted Microsoft 365 sync state (per-tenant cursor + vaulted token).
// The store is an interface so tests can run the sync job against an in-memory
// implementation without touching Postgres or the filesystem.

import type { GraphClient, GraphDriveItem } from "./graph";
import type { TokenEnvelope } from "./tokens";
import {
  decryptEnvelope,
  encryptEnvelope,
  resolveEncryptionKey,
  sameTokenFingerprint,
} from "./tokens";

export interface SyncStore {
  /** Fetch the latest sync cursor for a tenant. Returns null if never synced. */
  getCursor(tenantId: string): Promise<SyncCursor | null>;
  /** Persist a new cursor (delta link) and the token envelope. */
  saveCursor(tenantId: string, cursor: SyncCursor): Promise<void>;
  /** Fetch the vaulted token envelope for a tenant. Returns null if not connected. */
  getTokenEnvelope(tenantId: string): Promise<TokenEnvelope | null>;
  /** Persist a refreshed token envelope. */
  saveTokenEnvelope(tenantId: string, envelope: TokenEnvelope): Promise<void>;
  /** Record that a sync run started. */
  markSyncStarted(tenantId: string): Promise<void>;
  /** Record that a sync run completed. */
  markSyncComplete(tenantId: string, result: SyncRunResult): Promise<void>;
}

export interface SyncCursor {
  deltaLink: string;
  tokenFingerprint: string;
  updatedAt: string;
}

export interface SyncRunResult {
  itemsProcessed: number;
  itemsFailed: number;
  errors: string[];
}

export interface SyncJobDeps {
  graph: GraphClient;
  store: SyncStore;
  encryptionKey: string;
  driveId: string;
  clientId: string;
  clientSecret: string;
  ingest: (tenantId: string, driveItem: GraphDriveItem) => Promise<{ ok: boolean; error?: string }>;
  logger?: (level: "info" | "warn" | "error", msg: string, ctx?: Record<string, unknown>) => void;
}

const log = (logger?: SyncJobDeps["logger"]) =>
  logger ?? ((level, msg) => console[level]("[microsoft-sync] " + msg));

/**
 * runMicrosoftSync ? one polling pass.
 *
 * Exchanges the stored refresh token, decrypts the vault, walks the Graph
 * delta, and feeds each changed item into the ingestion pipeline. Failures
 * on one item never abort the whole pass; they are collected and the cursor
 * is only advanced on success.
 */
export async function runMicrosoftSync(tenantId: string, deps: SyncJobDeps): Promise<SyncRunResult> {
  const logger = log(deps.logger);
  const result: SyncRunResult = { itemsProcessed: 0, itemsFailed: 0, errors: [] };

  const key = resolveEncryptionKey(deps.encryptionKey);
  if (!key) {
    logger("error", "MICROSOFT_SYNC_ENCRYPTION_KEY not configured", { tenantId });
    result.errors.push("encryption_key_missing");
    return result;
  }

  const envelope = await deps.store.getTokenEnvelope(tenantId);
  if (!envelope) {
    logger("warn", "no token envelope; skipping sync", { tenantId });
    return result;
  }

  const decrypted = decryptEnvelope(envelope, key);
  if (!decrypted.ok) {
    logger("error", "could not decrypt token envelope", { tenantId, err: decrypted.error });
    result.errors.push("token_decrypt_failed");
    return result;
  }

  const cursor = await deps.store.getCursor(tenantId);
  const tokenResult = await deps.graph.exchangeToken({
    tenantId,
    clientId: deps.clientId,
    clientSecret: deps.clientSecret,
    grantType: "refresh_token",
    refreshToken: decrypted.plaintext,
    scopes: ["https://graph.microsoft.com/.default"],
  });

  if (!tokenResult.ok) {
    const err = tokenResult.error ?? "token exchange failed";
    logger("error", "token exchange failed", { tenantId, err });
    result.errors.push(err);
    return result;
  }

  const tokenSet = tokenResult.value;
  const newRefresh = tokenSet.refreshToken ?? decrypted.plaintext;
  const refreshed: TokenEnvelope = encryptEnvelope({
    plaintext: newRefresh,
    key,
    keyId: undefined,
  });

  const delta = await deps.graph.listDriveChanges(deps.driveId, cursor?.deltaLink ?? null, tokenSet.accessToken);
  if (!delta.ok) {
    const err = delta.error ?? "delta query failed";
    logger("error", "delta query failed", { tenantId, err });
    result.errors.push(err);
    return result;
  }

  for (const item of delta.items) {
    if (item.error) {
      result.itemsFailed++;
      result.errors.push(item.error.code ?? "item_error");
      continue;
    }
    try {
      const outcome = await deps.ingest(tenantId, item);
      if (outcome.ok) {
        result.itemsProcessed++;
      } else {
        result.itemsFailed++;
        if (outcome.error) result.errors.push(outcome.error);
      }
    } catch (e) {
      result.itemsFailed++;
      result.errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  // Persist refreshed token + new cursor only if the pass completed.
  await deps.store.saveTokenEnvelope(tenantId, refreshed);
  await deps.store.saveCursor(tenantId, {
    deltaLink: delta.deltaLink ?? cursor?.deltaLink ?? "",
    tokenFingerprint: sameTokenFingerprint(newRefresh, decrypted.plaintext) ? "rotated" : "unchanged",
    updatedAt: new Date().toISOString(),
  });
  await deps.store.markSyncComplete(tenantId, result);

  logger("info", "sync pass complete", { tenantId, ...result });
  return result;
}
