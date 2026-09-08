import { loadEnv, apiEnvSchema, type ApiEnv } from "@workspace/config";

/** Validated once at module load — the process fails fast on bad config. */
export const config: ApiEnv = loadEnv(apiEnvSchema);

if (config.NODE_ENV === "production" && !config.DATABASE_URL) {
  throw new Error("DATABASE_URL must be configured in production.");
}

export function resolveAuthSecret(env: ApiEnv): string {
  if (env.NODE_ENV === "production") {
    if (!env.SESSION_SECRET) {
      throw new Error(
        "SESSION_SECRET must be set and at least 32 characters in production.",
      );
    }
    return env.SESSION_SECRET;
  }
  return (
    env.SESSION_SECRET ??
    env.AUTH_SECRET ??
    "dev-only-insecure-secret-change-me"
  );
}

export const authSecret = resolveAuthSecret(config);
