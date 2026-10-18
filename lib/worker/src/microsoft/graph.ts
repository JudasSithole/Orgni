/**
 * Microsoft Graph client seam.
 *
 * Wraps the Graph REST API for the two things the sync job needs: token
 * exchange (client-credentials / refresh-token ? access/refresh token) and
 * change notifications (listDriveChanges to walk a drive delta).
 *
 * `fetch` is injected so the module is testable without live HTTP: tests
 * stand up a mock fetch that serves the Graph responses, exactly like the
 * OIDC seam mocks `fetch` for discovery + JWKS.
 *
 * Every call carries the bearer token from the vault (see ./tokens.ts) and
 * never a client-supplied value ? the sync runs server-side with the app
 * registration's credentials, not a user's.
 */

export interface GraphTokenSet {
  accessToken: string;
  refreshToken: string | null;
  /** Seconds since epoch when the access token expires. */
  expiresAt: number;
  /** Microsoft tenant id the token is valid for. */
  tenantId: string;
  /** User principal name (email) when this is a delegated token. */
  userUpn?: string | null;
}

export interface GraphDriveItem {
  id: string;
  name: string;
  folder?: { childCount: number } | null;
  file?: { mimeType: string } | null;
  parentReference?: { driveId: string; path: string } | null;
  size?: number | null;
  lastModifiedDateTime?: string | null;
  deleted?: { state: string } | null;
  /** When present this is a change the sync should re-ingest. */
  remoteItem?: GraphDriveItem | null;
  /** Set by Graph when this entry is an error, not a change. */
  error?: { code: string; message: string } | null;
}

export type GraphDeltaPage =
  | {
      ok: true;
      items: GraphDriveItem[];
      /** Next delta link; null when the delta is complete. */
      deltaLink: string | null;
      /** Next continuation link; null when the page is complete. */
      nextLink: string | null;
    }
  | {
      ok: false;
      error: string;
      items: [];
      deltaLink: null;
      nextLink: null;
    };

export interface TokenExchangeRequest {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  /** "client_credentials" (app-only) or "refresh_token" (delegated). */
  grantType: "client_credentials" | "refresh_token";
  refreshToken?: string;
  scopes?: string[];
}

export type TokenExchangeResult =
  | { ok: true; value: GraphTokenSet }
  | { ok: false; error: string };

export interface GraphClient {
  exchangeToken(req: TokenExchangeRequest): Promise<TokenExchangeResult>;
  listDriveChanges(
    driveId: string,
    deltaLink: string | null,
    accessToken: string,
  ): Promise<GraphDeltaPage>;
}

/** The production Graph client ? real HTTP, no mocking. */
export function createGraphClient(fetchImpl?: typeof fetch): GraphClient {
  return new HttpGraphClient(fetchImpl ?? fetch);
}

class HttpGraphClient implements GraphClient {
  private readonly fetch: typeof fetch;
  constructor(fetchImpl: typeof fetch) {
    this.fetch = fetchImpl;
  }

  async exchangeToken(req: TokenExchangeRequest): Promise<TokenExchangeResult> {
    const body = new URLSearchParams({
      client_id: req.clientId,
      client_secret: req.clientSecret,
      grant_type: req.grantType,
      scope: (req.scopes ?? ["https://graph.microsoft.com/.default"]).join(" "),
    });
    if (req.refreshToken) body.set("refresh_token", req.refreshToken);

    const tokenEndpoint = `https://login.microsoftonline.com/${req.tenantId}/oauth2/v2.0/token`;
    let res: Response;
    try {
      res = await this.fetch(tokenEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
    } catch (err) {
      return { ok: false, error: `token_endpoint_unreachable: ${err instanceof Error ? err.message : String(err)}` };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `token_exchange_failed: ${res.status} ${text.slice(0, 200)}` };
    }
    const json = (await res.json()) as {
      access_token?: string;
      refresh_token?: string | null;
      expires_in?: number;
    };
    if (!json.access_token) {
      return { ok: false, error: "token_exchange_failed: no access_token in response" };
    }
    return {
      ok: true,
      value: {
        accessToken: json.access_token,
        refreshToken: json.refresh_token ?? null,
        expiresAt: Math.floor(Date.now() / 1000) + (json.expires_in ?? 3600),
        tenantId: req.tenantId,
      },
    };
  }

  async listDriveChanges(
    driveId: string,
    deltaLink: string | null,
    accessToken: string,
  ): Promise<GraphDeltaPage> {
    const url = deltaLink ?? `https://graph.microsoft.com/v1.0/drives/${driveId}/root:/delta`;
    let res: Response;
    try {
      res = await this.fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err) {
      return {
        ok: false,
        error: `delta_endpoint_unreachable: ${err instanceof Error ? err.message : String(err)}`,
        items: [],
        deltaLink: null,
        nextLink: null,
      };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        ok: false,
        error: `delta_query_failed: ${res.status} ${text.slice(0, 200)}`,
        items: [],
        deltaLink: null,
        nextLink: null,
      };
    }
    const json = (await res.json()) as {
      value?: GraphDriveItem[];
      "@odata.deltaLink"?: string;
      "@odata.nextLink"?: string;
    };
    return {
      ok: true,
      items: json.value ?? [],
      deltaLink: json["@odata.deltaLink"] ?? null,
      nextLink: json["@odata.nextLink"] ?? null,
    };
  }
}
