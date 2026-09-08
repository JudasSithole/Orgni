import { pino, type Logger } from "pino";

/**
 * Shared logging for all backend services.
 *
 * Structured JSON logs by default (production-friendly for Azure Log
 * Analytics / any log aggregator). Never use console.log in services.
 */

export interface CreateLoggerOptions {
  /** Service name attached to every log line. */
  service: string;
  /** Log level; defaults to "info" (or LOG_LEVEL env var). */
  level?: string;
}

export function createLogger(options: CreateLoggerOptions): Logger {
  return pino({
    name: options.service,
    level: options.level ?? process.env.LOG_LEVEL ?? "info",
    base: { service: options.service },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

/** Time an async operation and log its duration. */
export async function withTiming<T>(
  log: Logger,
  label: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    log.info({ label, durationMs: Date.now() - start }, "operation completed");
    return result;
  } catch (err) {
    log.error(
      { label, durationMs: Date.now() - start, err },
      "operation failed",
    );
    throw err;
  }
}

export type { Logger };
