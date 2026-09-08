import { loadEnv, apiEnvSchema, type ApiEnv } from "@workspace/config";

/** Validated once at module load — the process fails fast on bad config. */
export const config: ApiEnv = loadEnv(apiEnvSchema);
