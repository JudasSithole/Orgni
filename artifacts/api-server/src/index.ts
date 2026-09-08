import app from "./app";
import { logger } from "./lib/logger";
import { config } from "./lib/config";
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";

function startDocumentIntelligence(): ChildProcess | null {
  if (config.DOCUMENT_INTELLIGENCE_URL) return null;
  const candidates = [
    path.resolve(process.cwd(), "intelligence/document-intelligence"),
    path.resolve(process.cwd(), "../../intelligence/document-intelligence"),
  ];
  const serviceDir = candidates.find((candidate) =>
    existsSync(path.join(candidate, "main.py")),
  );
  if (!serviceDir) {
    throw new Error("Bundled Document Intelligence service is missing.");
  }
  const child = spawn(
    "python3",
    ["-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000"],
    { cwd: serviceDir, stdio: ["ignore", "inherit", "inherit"] },
  );
  child.on("exit", (code) => {
    if (code !== 0) {
      logger.fatal({ code }, "Document Intelligence exited");
      process.exit(1);
    }
  });
  return child;
}

const documentIntelligence = startDocumentIntelligence();

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
  documentIntelligence?.kill("SIGTERM");
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
