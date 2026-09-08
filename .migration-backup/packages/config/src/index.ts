import { z } from "zod/v4";

/**
 * Centralised, validated environment configuration.
 *
 * Each app defines (or reuses) a schema and calls `loadEnv(schema)` at boot.
 * Invalid or missing configuration fails fast with a readable error instead
 * of surfacing as undefined behaviour at runtime.
 */

export const nodeEnvSchema = z
  .enum(["development", "test", "production"])
  .default("development");

/** Shared base: every service gets NODE_ENV. */
export const baseEnvSchema = z.object({
  NODE_ENV: nodeEnvSchema,
});

/** API service configuration. */
export const apiEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().optional(),
  /**
   * Comma-separated list of allowed CORS origins.
   * Supports wildcard subdomains, e.g. "https://*.vercel.app".
   * Unset in production = same-origin only (no cross-origin access).
   * Ignored in development (all origins allowed for local DX).
   */
  CORS_ORIGINS: z.string().optional(),
  /** pino log level (fatal|error|warn|info|debug|trace). */
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  /** Human-readable release version for /version (falls back to package version). */
  APP_VERSION: z.string().optional(),
  /** Populated by CI/CD for the /version endpoint. */
  GIT_SHA: z.string().optional(),
  /**
   * Base URL of the Python Document Intelligence service
   * (intelligence/document-intelligence). Required for the document upload
   * endpoint; unset disables it with a clear 503.
   */
  DOCUMENT_INTELLIGENCE_URL: z.string().url().optional(),
  /**
   * Base URL of the Python Organizational Ontology service
   * (intelligence/organizational-ontology). When set, the upload endpoint maps
   * tokens into reviewable facts; when unset, it returns tokens only.
   */
  ONTOLOGY_URL: z.string().url().optional(),
  /** Max upload size in bytes for the document endpoint (default 20 MB). */
  MAX_UPLOAD_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(20 * 1024 * 1024),
  /**
   * HMAC secret used to sign dev-mode session tokens. This is the seam that a
   * real OIDC provider (Entra External ID) replaces in production; until then,
   * the API issues and verifies its own signed tokens. Change it in any shared
   * environment.
   */
  AUTH_SECRET: z.string().default("dev-only-insecure-secret-change-me"),
});

/** Worker service configuration. */
export const workerEnvSchema = baseEnvSchema.extend({
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  /** Polling interval for the job loop, in milliseconds. */
  WORKER_POLL_INTERVAL_MS: z.coerce.number().int().positive().default(5000),
  GIT_SHA: z.string().optional(),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;

/**
 * Parse and validate `process.env` against a schema.
 * Throws with a readable message when validation fails.
 */
export function loadEnv<T extends z.ZodType>(schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return result.data;
}
