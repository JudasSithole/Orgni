import app from "./app";
import { logger } from "./lib/logger";
import { config } from "./lib/config";

// PORT comes from validated config (@workspace/config). Azure Container Apps
// does not inject PORT automatically — it must be set alongside targetPort.
const port = config.PORT;

const server = app.listen(port, "0.0.0.0", (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port, nodeEnv: config.NODE_ENV }, "Server listening");
});

/** Graceful shutdown: stop accepting connections, drain in-flight requests. */
function shutdown(signal: string) {
  logger.info({ signal }, "shutting down");
  server.close((err) => {
    if (err) {
      logger.error({ err }, "error during shutdown");
      process.exit(1);
    }
    process.exit(0);
  });
  // Hard exit if draining takes too long (Container Apps sends SIGKILL anyway)
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
