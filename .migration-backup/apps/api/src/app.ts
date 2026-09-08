import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { config } from "./lib/config";

const app: Express = express();

/**
 * Environment-based CORS.
 * - development: all origins (local DX, Replit preview proxy)
 * - production: only origins listed in CORS_ORIGINS (comma-separated,
 *   supports wildcard subdomains like "https://*.vercel.app").
 *   Unset CORS_ORIGINS = same-origin only.
 */
function buildCorsOrigin(): cors.CorsOptions["origin"] {
  if (config.NODE_ENV !== "production") return true;
  const patterns = (config.CORS_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (patterns.length === 0) return false;
  const matchers = patterns.map((p) => {
    if (!p.includes("*")) return (origin: string) => origin === p;
    const re = new RegExp(
      `^${p.split("*").map(escapeRegExp).join("[a-z0-9-]+")}$`,
      "i",
    );
    return (origin: string) => re.test(origin);
  });
  return (origin, callback) => {
    // Non-browser requests (no Origin header) are allowed; they are not CORS.
    if (!origin) return callback(null, true);
    callback(
      null,
      matchers.some((m) => m(origin)),
    );
  };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
}

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors({ origin: buildCorsOrigin() }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
