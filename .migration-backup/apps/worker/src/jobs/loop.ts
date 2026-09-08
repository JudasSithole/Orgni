import type { WorkerEnv } from "@workspace/config";
import type { Logger } from "@workspace/observability";

export interface JobLoopContext {
  env: WorkerEnv;
  log: Logger;
  isShuttingDown: () => boolean;
}

/**
 * Minimal polling job loop.
 *
 * Job sources will be wired in as they are ported:
 *  - document ingestion  (see ../ingestion)
 *  - document processing (delegates to the Python document-service)
 *  - scheduled maintenance
 *
 * When Redis-backed queues are introduced (REDIS_URL), this loop is replaced
 * by a queue consumer; the surrounding lifecycle (logging, shutdown) stays.
 */
export async function runJobLoop(ctx: JobLoopContext): Promise<void> {
  const { env, log, isShuttingDown } = ctx;

  while (!isShuttingDown()) {
    try {
      // No persistent job sources are wired yet; this is a heartbeat so the
      // service is observable and deployable ahead of the queue work.
      log.debug("job loop tick — no pending jobs");
    } catch (err) {
      log.error({ err }, "job iteration failed");
    }
    await sleep(env.WORKER_POLL_INTERVAL_MS);
  }
  log.info("job loop stopped");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
