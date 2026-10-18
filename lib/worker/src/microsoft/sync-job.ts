/**
 * Microsoft 365 sync job source — factory for the worker loop.
 *
 * The factory returns a one-shot async function the job loop calls every tick.
 * It is intentionally cheap when nothing is configured: no env vars, no db, no
 * connected tenants → it returns immediately. The first real work only happens
 * when an admin completes the connect flow and a refresh token is vaulted.
 *
 * @workspace/db/connect is imported lazily so the worker boots cleanly without
 * Postgres configured.
 */

import { createSyncStore } from "./store";
import { runMicrosoftSync } from "./sync";
import { createGraphClient } from "./graph";
import type { JobLoopContext } from "../jobs/loop.js";

export interface MicrosoftSyncJobOptions {
  tenantId: string;
  driveId?: string;
}

export async function createMicrosoftSyncJobSource(
  ctx: JobLoopContext,
): Promise<((ctx: JobLoopContext) => Promise<void>) | null> {
  const { env, log } = ctx;
    const {
      MICROSOFT_TENANT_ID,
      MICROSOFT_CLIENT_ID,
      MICROSOFT_CLIENT_SECRET,
      MICROSOFT_SYNC_ENCRYPTION_KEY,
      MICROSOFT_DRIVE_ID,
      DATABASE_URL,
    } = env;

    if (
      !MICROSOFT_TENANT_ID ||
      !MICROSOFT_CLIENT_ID ||
      !MICROSOFT_CLIENT_SECRET ||
      !MICROSOFT_SYNC_ENCRYPTION_KEY ||
      !DATABASE_URL
    ) {
      log.debug("microsoft sync not configured; skipping");
      return null;
    }

    // @ts-ignore - @workspace/db/connect is loaded lazily at runtime
    const { createDb } = await import("@workspace/db/connect");
    const handle = createDb(DATABASE_URL);
    const store = await createSyncStore({ db: handle, driveId: MICROSOFT_DRIVE_ID });
    const graph = createGraphClient();

    return async (_loopCtx: JobLoopContext) => {
      const logger = (level: "info" | "warn" | "error", msg: string, extra?: Record<string, unknown>) => {
        const payload = { ...extra };
        if (level === "info") log.info(payload, msg);
        else if (level === "warn") log.warn(payload, msg);
        else log.error(payload, msg);
      };

      const ingest = async (_tenantId: string, driveItem: { id: string; name: string }) => {
        // Drive items arrive as metadata; the sync fetches the content lazily.
        // For now we record the item identity — full content fetch lands once
        // the Graph download path is wired into graph.ts.
        logger("warn", "drive item received without content fetch", {
          itemId: driveItem.id,
          name: driveItem.name,
        });
        return { ok: true };
      };

      await runMicrosoftSync(MICROSOFT_TENANT_ID, {
        graph,
        store,
        encryptionKey: MICROSOFT_SYNC_ENCRYPTION_KEY,
        clientId: MICROSOFT_CLIENT_ID,
        clientSecret: MICROSOFT_CLIENT_SECRET,
        driveId: MICROSOFT_DRIVE_ID ?? "",
        ingest,
        logger,
      });
    };
}