/**
 * Teams app manifest + installable app package (.zip).
 *
 * The manifest is generated from config so the bot id, messaging endpoint and
 * valid domains always match this deployment. `buildAppPackage()` returns the
 * zip Teams admins upload (manifest.json + color.png + outline.png).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import AdmZip from "adm-zip";
import { config } from "../lib/config";

const here = path.dirname(fileURLToPath(import.meta.url));
// Icons live next to the source; the build copies `assets/` into dist/.
const assetsDir = path.resolve(here, "assets");

/** Manifest GUID for the Teams app itself (stable across deployments). */
const TEAMS_APP_ID = config.TEAMS_APP_ID ?? "00000000-0000-0000-0000-000000000000";
/** The bot's Azure app-registration id. */
const BOT_ID = config.MICROSOFT_APP_ID ?? "00000000-0000-0000-0000-000000000000";

export function resolveBaseUrl(reqOrigin?: string): string {
  return (config.PUBLIC_BASE_URL ?? reqOrigin ?? "https://localhost:5001").replace(
    /\/+$/,
    "",
  );
}

export function buildManifest(baseUrl: string): Record<string, unknown> {
  const domain = new URL(baseUrl).host;
  return {
    $schema:
      "https://developer.microsoft.com/en-us/json-schemas/teams/v1.19/MicrosoftTeams.schema.json",
    manifestVersion: "1.19",
    version: "1.0.0",
    id: TEAMS_APP_ID,
    developer: {
      name: "Olyxee",
      websiteUrl: "https://orgni.com",
      privacyUrl: "https://www.olyxee.com/privacy",
      termsOfUseUrl: "https://www.olyxee.com/terms",
    },
    name: { short: "Orgni", full: "Orgni — operational intelligence" },
    description: {
      short: "Give Orgni work and it gets done across your tools.",
      full: "Orgni understands your organisation and helps keep work moving. Mention @Orgni in any chat to ask a question, find a document, prepare a brief, or set up a meeting. What Orgni can do and when it must ask first is controlled by your admin in the Orgni web app.",
    },
    icons: { color: "color.png", outline: "outline.png" },
    accentColor: "#FE5101",
    bots: [
      {
        botId: BOT_ID,
        scopes: ["personal", "team", "groupchat"],
        supportsFiles: false,
        isNotificationOnly: false,
        commandLists: [
          {
            scopes: ["personal", "team", "groupchat"],
            commands: [
              { title: "prepare", description: "Prepare a brief for an upcoming meeting" },
              { title: "find", description: "Find a document or record" },
              { title: "status", description: "Ask the status of something" },
            ],
          },
        ],
      },
    ],
    permissions: ["identity", "messageTeamMembers"],
    validDomains: [domain],
    webApplicationInfo: {
      id: BOT_ID,
      resource: `api://${domain}/${BOT_ID}`,
    },
  };
}

export function buildAppPackage(baseUrl: string): Buffer {
  const zip = new AdmZip();
  const manifest = buildManifest(baseUrl);
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2), "utf8"));

  for (const icon of ["color.png", "outline.png"] as const) {
    try {
      zip.addFile(icon, readFileSync(path.join(assetsDir, icon)));
    } catch {
      // Fall back to a 1x1 transparent PNG so the package is always valid.
      zip.addFile(icon, TRANSPARENT_PNG);
    }
  }
  return zip.toBuffer();
}

/** 1x1 transparent PNG — last-resort icon so the package never fails to build. */
const TRANSPARENT_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
