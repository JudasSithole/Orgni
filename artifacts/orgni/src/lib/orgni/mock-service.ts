/**
 * Mock Orgni service — a localStorage-backed implementation of the product
 * domain. Everything is persisted per tenant so a refresh keeps state.
 *
 * This is the temporary stand-in for real backend services. The public surface
 * (`loadState`, `saveState`, the pure `reduce*` helpers) is deliberately small
 * and free of React so a real service can be dropped in behind the same
 * `OrgniProvider`.
 */
import {
  DEFAULT_APPROVALS,
  DEFAULT_CAPABILITIES,
  DEFAULT_INTELLIGENCE,
  DEFAULT_PERMISSIONS,
} from "./defaults";
import type {
  Capability,
  CapabilityKey,
  Connection,
  KnowledgeSummary,
  OrgniState,
  Organisation,
} from "./types";

const STORAGE_PREFIX = "orgni.product.";

function storageKey(tenantId: string): string {
  return `${STORAGE_PREFIX}${tenantId || "default"}`;
}

export function emptyKnowledge(): KnowledgeSummary {
  return {
    counts: {
      people: 0,
      customers: 0,
      suppliers: 0,
      projects: 0,
      policies: 0,
      documents: 0,
      processes: 0,
    },
    lastUpdatedAt: null,
    state: "idle",
    sources: [],
    graph: { nodes: [], edges: [] },
  };
}

export function initialState(): OrgniState {
  return {
    organisation: null,
    connections: [],
    knowledge: emptyKnowledge(),
    capabilities: DEFAULT_CAPABILITIES.map((c) => ({ ...c })),
    approvals: DEFAULT_APPROVALS.map((a) => ({ ...a })),
    permissions: {
      access: DEFAULT_PERMISSIONS.access.map((a) => ({ ...a })),
      audience: DEFAULT_PERMISSIONS.audience,
    },
    teams: { state: "not_installed", mode: "mock", installedAt: null },
    activity: [],
    intelligence: { ...DEFAULT_INTELLIGENCE },
    members: [],
  };
}


export function loadState(tenantId: string): OrgniState {
  const base = initialState();
  try {
    const raw = localStorage.getItem(storageKey(tenantId));
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<OrgniState>;
    // Merge defensively so new fields added later still get sane values.
    return {
      ...base,
      ...parsed,
      // Knowledge is always re-derived from the model API — never cached.
      knowledge: base.knowledge,
      permissions: { ...base.permissions, ...(parsed.permissions ?? {}) },
      teams: { ...base.teams, ...(parsed.teams ?? {}) },
      intelligence: { ...base.intelligence, ...(parsed.intelligence ?? {}) },
      capabilities:
        parsed.capabilities && parsed.capabilities.length > 0
          ? mergeCapabilities(base.capabilities, parsed.capabilities)
          : base.capabilities,
      approvals:
        parsed.approvals && parsed.approvals.length > 0
          ? parsed.approvals
          : base.approvals,
      connections: parsed.connections ?? [],
      activity: parsed.activity ?? [],
      members: parsed.members ?? [],
    };
  } catch {
    return base;
  }
}

export function saveState(tenantId: string, state: OrgniState): void {
  try {
    // Don't cache knowledge (large, always re-derived) or avatars.
    const { knowledge: _k, ...rest } = state;
    void _k;
    localStorage.setItem(storageKey(tenantId), JSON.stringify(rest));
  } catch {
    /* storage unavailable — state stays in memory for this session */
  }
}

export function clearState(tenantId: string): void {
  try {
    localStorage.removeItem(storageKey(tenantId));
  } catch {
    /* ignore */
  }
}

function mergeCapabilities(
  base: Capability[],
  stored: Capability[],
): Capability[] {
  const byKey = new Map(stored.map((c) => [c.key, c]));
  return base.map((c) => {
    const s = byKey.get(c.key);
    return s ? { ...c, enabled: s.enabled } : c;
  });
}

/** Build a Connection record from the catalogue entry when a user connects it. */
export function connectFromCatalog(
  entry: Omit<Connection, "status" | "mode" | "connectedAt">,
): Connection {
  return {
    ...entry,
    status: "connected",
    mode: "mock",
    connectedAt: new Date().toISOString(),
  };
}

export function capabilityLabel(key: CapabilityKey): string {
  return (
    DEFAULT_CAPABILITIES.find((c) => c.key === key)?.label ?? "Do work"
  );
}

export function organisationFromInput(input: {
  name: string;
  workEmail: string;
  website: string;
}): Organisation {
  return {
    id: `org_${Date.now().toString(36)}`,
    name: input.name.trim(),
    workEmail: input.workEmail.trim(),
    website: input.website.trim(),
    createdAt: new Date().toISOString(),
    onboardingStep: 1,
    onboardingComplete: false,
  };
}
