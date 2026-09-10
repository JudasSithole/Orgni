/**
 * HTTP client for the product / control-centre API (`/api/product/*`,
 * `/api/teams/*`). Returns the full `OrgniState` after each mutation so the
 * provider can just replace its state.
 */
import { API_URL } from "@/lib/api";
import type {
  ApprovalCategoryKey,
  ApprovalLevel,
  AudienceScope,
  CapabilityKey,
  MemberRole,
  OrgniState,
} from "./types";

async function req<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { "content-type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
    credentials: "include",
  });
  if (!res.ok) {
    let code = res.statusText;
    try {
      code = (await res.json()).error ?? code;
    } catch {
      /* ignore */
    }
    throw new Error(code);
  }
  return (await res.json()) as T;
}

export interface TeamsStatus {
  configured: boolean;
  botId: string | null;
  teamsAppId: string | null;
  appType: string;
  messagingEndpoint: string;
  packageUrl: string;
}

export interface AskResult {
  reply: string;
  needsApproval: boolean;
  action: OrgniState["activity"][number];
}

export const productApi = {
  getState: (token: string) =>
    req<OrgniState & { durable?: boolean }>("/api/product/state", token),

  createOrganisation: (
    token: string,
    body: { name: string; workEmail: string; website: string },
  ) =>
    req<OrgniState>("/api/product/organisation", token, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patchOnboarding: (token: string, body: { step?: number; complete?: boolean }) =>
    req<OrgniState>("/api/product/onboarding", token, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  connect: (token: string, key: string) =>
    req<OrgniState>("/api/product/connections", token, {
      method: "POST",
      body: JSON.stringify({ key }),
    }),

  disconnect: (token: string, key: string) =>
    req<OrgniState>(`/api/product/connections/${encodeURIComponent(key)}`, token, {
      method: "DELETE",
    }),

  setCapability: (token: string, key: CapabilityKey, enabled: boolean) =>
    req<OrgniState>("/api/product/capabilities", token, {
      method: "PATCH",
      body: JSON.stringify({ key, enabled }),
    }),

  setApproval: (token: string, key: ApprovalCategoryKey, level: ApprovalLevel) =>
    req<OrgniState>("/api/product/approvals", token, {
      method: "PATCH",
      body: JSON.stringify({ key, level }),
    }),

  setPermission: (
    token: string,
    body: { key?: string; level?: ApprovalLevel; audience?: AudienceScope },
  ) =>
    req<OrgniState>("/api/product/permissions", token, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  installTeams: (token: string) =>
    req<OrgniState>("/api/product/teams/install", token, { method: "POST" }),

  addMember: (token: string, email: string, role?: MemberRole) =>
    req<OrgniState>("/api/product/members", token, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  updateMember: (
    token: string,
    email: string,
    patch: { name?: string; role?: MemberRole; avatar?: string | null },
  ) =>
    req<OrgniState>(`/api/product/members/${encodeURIComponent(email)}`, token, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }),

  removeMember: (token: string, email: string) =>
    req<OrgniState>(`/api/product/members/${encodeURIComponent(email)}`, token, {
      method: "DELETE",
    }),

  resolveActivity: (token: string, id: string, approve: boolean) =>
    req<OrgniState>(`/api/product/activity/${id}/resolve`, token, {
      method: "POST",
      body: JSON.stringify({ approve }),
    }),

  ask: (token: string, text: string) =>
    req<AskResult>("/api/product/ask", token, {
      method: "POST",
      body: JSON.stringify({ text }),
    }),

  reset: (token: string) =>
    req<OrgniState>("/api/product/reset", token, { method: "POST" }),

  teamsStatus: (token: string) =>
    req<TeamsStatus>("/api/teams/status", token),

  linkTeams: (token: string, aadTenantId: string) =>
    req<{ ok: boolean }>("/api/teams/link", token, {
      method: "POST",
      body: JSON.stringify({ aadTenantId }),
    }),
};

/** Absolute URL for the Teams app package download (needs the auth header,
 *  so callers fetch it as a blob rather than linking directly). */
export function teamsPackageUrl(): string {
  return `${API_URL}/api/teams/app-package.zip`;
}
