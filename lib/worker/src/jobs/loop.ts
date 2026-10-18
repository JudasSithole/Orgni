import type { WorkerEnv } from "@workspace/config";
import type { Logger } from "@workspace/observability";

export interface JobLoopContext {
  env: WorkerEnv;
  log: Logger;
  isShuttingDown: () => boolean;
  /** Optional job sources. Each is a one-shot async function; the loop runs
   *  them every tick and never lets one failure stall the others. */
  jobSources?: Array<(ctx: JobLoopContext) => Promise<void>>;
}

/**
 * Polling job loop.
 *
 * Job sources are wired in as they are ported:
 *  - Microsoft 365 sync   (see ../microsoft)
 *  - document ingestion   (see ../ingestion)
 *  - document processing  (delegates to the Python document-service)
 *  - scheduled maintenance
 *
 * When Redis-backed queues are introduced (REDIS_URL), this loop is replaced
 * by a queue consumer; the surrounding lifecycle (logging, shutdown) stays.
 */
export async function runJobLoop(ctx: JobLoopContext): Promise<void> {
  const { env, log, isShuttingDown, jobSources } = ctx;

  while (!isShuttingDown()) {
    try {
      if (jobSources && jobSources.length > 0) {
        for (const source of jobSources) {
          try {
            await source(ctx);
          } catch (err) {
            log.error({ err }, "job source failed");
          }
        }
      } else {
        // Heartbeat so the service is observable and deployable ahead of the
        // queue work. Remove this branch once a real source is wired.
        log.debug("job loop tick — no pending jobs");
      }
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
