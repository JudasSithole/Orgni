import { loadEnv, workerEnvSchema } from "@workspace/config";
import { createLogger } from "@workspace/observability";
import { runJobLoop } from "./jobs/loop.js";

/**
 * Orgni worker — background & asynchronous processing.
 *
 * Owns long-running tasks: document ingestion, processing pipelines, and
 * future scheduled jobs. Stateless by design: all state lives in PostgreSQL
 * (and later Redis for queues), so multiple replicas can run side by side.
 */

const env = loadEnv(workerEnvSchema);
const log = createLogger({ service: "orgni-worker" });

let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  log.info({ signal }, "shutting down");
  // Give the in-flight iteration a moment to finish, then exit.
  setTimeout(() => process.exit(0), 2000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

log.info(
  { nodeEnv: env.NODE_ENV, pollIntervalMs: env.WORKER_POLL_INTERVAL_MS },
  "worker started",
);

await runJobLoop({
  env,
  log,
  isShuttingDown: () => shuttingDown,
});
