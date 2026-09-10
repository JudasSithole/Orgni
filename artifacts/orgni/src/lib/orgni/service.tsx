/**
 * OrgniProvider — the single source of truth for the product experience.
 *
 * Prefers the server API (`/api/product/*`) so the web app and the Teams bot
 * agree. When the API is unreachable it falls back to a localStorage-backed
 * mock so the app still works offline / without a backend. `knowledge` is
 * always derived client-side from the documents API (+ demo data).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/lib/auth";
import { getOverview, listDocuments, uploadDocument, ApiError } from "@/lib/api";
import { productApi } from "./http-service";
import { CONNECTION_CATALOG } from "./defaults";
import {
  clearState,
  connectFromCatalog,
  demoEnrichment,
  initialState,
  loadState,
  organisationFromInput,
  saveState,
} from "./mock-service";
import type {
  ApprovalCategoryKey,
  ApprovalLevel,
  AudienceScope,
  CapabilityKey,
  KnowledgeSource,
  KnowledgeSummary,
  OrgniAction,
  OrgniState,
} from "./types";

interface OrgniContextValue {
  state: OrgniState;
  /** True once the product API answered — the web app and Teams bot are in sync. */
  backendConnected: boolean;
  /** True while the first load is in flight. */
  loading: boolean;
  /** True when knowledge figures are demo data, not live. */
  usingDemoData: boolean;

  createOrganisation: (input: {
    name: string;
    workEmail: string;
    website: string;
  }) => Promise<void>;
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;

  connect: (key: string) => Promise<void>;
  disconnect: (id: string) => void;

  addFiles: (files: File[]) => Promise<{ added: number; failed: number }>;
  startLearning: () => void;

  setCapability: (key: CapabilityKey, enabled: boolean) => void;
  setApproval: (key: ApprovalCategoryKey, level: ApprovalLevel) => void;
  setPermissionLevel: (key: string, level: ApprovalLevel) => void;
  setAudience: (audience: AudienceScope) => void;

  installTeams: () => Promise<void>;

  addMember: (email: string, role?: "owner" | "admin" | "member") => Promise<void>;
  updateMember: (
    email: string,
    patch: { name?: string; role?: "owner" | "admin" | "member"; avatar?: string | null },
  ) => Promise<void>;
  removeMember: (email: string) => void;

  resolveApproval: (id: string, approve: boolean) => void;
  logAction: (action: Omit<OrgniAction, "id" | "at">) => void;

  /** Re-pull product state from the server (after a simulate / external change). */
  refresh: () => void;

  resetWorkspace: () => void;
}

const OrgniContext = createContext<OrgniContextValue | null>(null);

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Merge a server product-state payload onto local state, keeping `knowledge`. */
function mergeServer(local: OrgniState, server: Partial<OrgniState>): OrgniState {
  return {
    ...local,
    organisation: server.organisation ?? null,
    connections: server.connections ?? [],
    capabilities: server.capabilities ?? local.capabilities,
    approvals: server.approvals ?? local.approvals,
    permissions: server.permissions ?? local.permissions,
    teams: server.teams ?? local.teams,
    activity: server.activity ?? [],
    intelligence: server.intelligence ?? local.intelligence,
    members: server.members ?? local.members ?? [],
  };
}

export function OrgniProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const tenantId = session?.tenantId ?? "anon";

  const [state, setState] = useState<OrgniState>(() => loadState(tenantId));
  const [backendConnected, setBackendConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const usesServer = useRef(false);
  const loadedTenant = useRef<string | null>(null);

  useEffect(() => {
    if (loadedTenant.current === tenantId) return;
    loadedTenant.current = tenantId;
    setState(loadState(tenantId));
  }, [tenantId]);

  useEffect(() => {
    saveState(tenantId, state);
  }, [tenantId, state]);

  // Load product state from the API, then enrich knowledge from documents.
  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      // 1. Product state (the shared source of truth).
      try {
        const server = await productApi.getState(session.token);
        if (cancelled) return;
        usesServer.current = true;
        setBackendConnected(true);
        setState((prev) => mergeServer(prev, server));
      } catch {
        usesServer.current = false;
        setBackendConnected(false);
      }

      // 2. Knowledge enrichment (best effort).
      try {
        const [docs, overview] = await Promise.all([
          listDocuments(session.token),
          getOverview(session.token).catch(() => null),
        ]);
        if (cancelled) return;
        const sources: KnowledgeSource[] = docs.documents.map((d) => ({
          id: d.sourceId,
          name: d.filename,
          kind: "file",
          addedAt: d.uploadedAt,
          state:
            d.state === "COMPLETED" || d.state === "PROCESSED"
              ? "understood"
              : d.state === "FAILED"
                ? "failed"
                : "processing",
          origin: "Uploaded file",
        }));
        setState((prev) => {
          const counts = { ...prev.knowledge.counts };
          if (overview) {
            counts.documents = overview.sources.total;
            counts.people = overview.entities;
          }
          const hasData = sources.length > 0;
          return {
            ...prev,
            knowledge: {
              ...prev.knowledge,
              sources,
              counts,
              state: hasData ? "ready" : prev.knowledge.state,
              lastUpdatedAt: hasData
                ? (sources[0]?.addedAt ?? prev.knowledge.lastUpdatedAt)
                : prev.knowledge.lastUpdatedAt,
            },
          };
        });
      } catch (err) {
        if (err instanceof ApiError) {
          /* persistence unavailable — keep whatever knowledge we have */
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  const patch = useCallback((fn: (prev: OrgniState) => OrgniState) => {
    setState(fn);
  }, []);

  /** Run a server call when connected; fall back to a local reducer otherwise. */
  const dual = useCallback(
    async (
      server: (token: string) => Promise<Partial<OrgniState>>,
      local: (prev: OrgniState) => OrgniState,
    ) => {
      if (usesServer.current && session) {
        try {
          const next = await server(session.token);
          setState((prev) => mergeServer(prev, next));
          return;
        } catch {
          /* fall through to local */
        }
      }
      setState(local);
    },
    [session],
  );

  const createOrganisation = useCallback<OrgniContextValue["createOrganisation"]>(
    async (input) => {
      if (usesServer.current && session) {
        try {
          const next = await productApi.createOrganisation(session.token, input);
          setState((prev) => mergeServer(prev, next));
          return;
        } catch {
          /* fall through */
        }
      }
      await wait(400);
      patch((prev) => ({ ...prev, organisation: organisationFromInput(input) }));
    },
    [patch, session],
  );

  const setOnboardingStep = useCallback<OrgniContextValue["setOnboardingStep"]>(
    (step) => {
      if (usesServer.current && session) {
        void productApi
          .patchOnboarding(session.token, { step })
          .then((next) => setState((prev) => mergeServer(prev, next)))
          .catch(() => {});
        return;
      }
      patch((prev) =>
        prev.organisation
          ? {
              ...prev,
              organisation: {
                ...prev.organisation,
                onboardingStep: Math.max(prev.organisation.onboardingStep, step),
              },
            }
          : prev,
      );
    },
    [patch, session],
  );

  const completeOnboarding = useCallback(() => {
    if (usesServer.current && session) {
      void productApi
        .patchOnboarding(session.token, { complete: true })
        .then((next) =>
          setState((prev) => {
            const merged = mergeServer(prev, next);
            return { ...merged, ...demoKnowledgeIfEmpty(merged) };
          }),
        )
        .catch(() => {});
      return;
    }
    patch((prev) =>
      prev.organisation
        ? {
            ...prev,
            organisation: {
              ...prev.organisation,
              onboardingComplete: true,
              onboardingStep: 7,
            },
            ...demoKnowledgeIfEmpty(prev),
          }
        : prev,
    );
  }, [patch, session]);

  const connect = useCallback<OrgniContextValue["connect"]>(
    async (key) => {
      const entry = CONNECTION_CATALOG.find((c) => c.key === key);
      if (!entry) return;
      await dual(
        (token) => productApi.connect(token, key),
        (prev) => ({
          ...prev,
          connections: [
            ...prev.connections.filter((c) => c.key !== key),
            connectFromCatalog(entry),
          ],
        }),
      );
    },
    [dual],
  );

  const disconnect = useCallback<OrgniContextValue["disconnect"]>(
    (id) => {
      const conn = state.connections.find((c) => c.id === id || c.key === id);
      const key = conn?.key ?? id;
      void dual(
        (token) => productApi.disconnect(token, key),
        (prev) => ({
          ...prev,
          connections: prev.connections.filter((c) => c.id !== id && c.key !== id),
        }),
      );
    },
    [dual, state.connections],
  );

  const addFiles = useCallback<OrgniContextValue["addFiles"]>(
    async (files) => {
      let added = 0;
      let failed = 0;
      const newSources: KnowledgeSource[] = [];
      for (const file of files) {
        if (session && backendConnected) {
          try {
            const res = await uploadDocument(session.token, file);
            added += 1;
            newSources.push({
              id: res.sourceId,
              name: file.name,
              kind: "file",
              addedAt: new Date().toISOString(),
              state: res.state === "FAILED" ? "failed" : "understood",
              origin: "Uploaded file",
            });
          } catch {
            failed += 1;
          }
        } else {
          await wait(250);
          added += 1;
          newSources.push({
            id: `src_${Date.now().toString(36)}_${added}`,
            name: file.name,
            kind: "file",
            addedAt: new Date().toISOString(),
            state: "processing",
            origin: "Uploaded file",
          });
        }
      }
      patch((prev) => ({
        ...prev,
        knowledge: {
          ...prev.knowledge,
          sources: [...newSources, ...prev.knowledge.sources],
          state: "learning",
          lastUpdatedAt: new Date().toISOString(),
        },
      }));
      return { added, failed };
    },
    [patch, session, backendConnected],
  );

  const startLearning = useCallback(() => {
    patch((prev) => ({
      ...prev,
      knowledge: { ...prev.knowledge, state: "learning" },
    }));
    setTimeout(() => {
      patch((prev) => {
        const enriched = demoEnrichment(prev);
        return {
          ...prev,
          knowledge: {
            ...enriched.knowledge,
            sources: prev.knowledge.sources.map((s) => ({
              ...s,
              state: s.state === "processing" ? "understood" : s.state,
            })),
            state: "ready",
            lastUpdatedAt: new Date().toISOString(),
          },
        };
      });
    }, 2400);
  }, [patch]);

  const setCapability = useCallback<OrgniContextValue["setCapability"]>(
    (key, enabled) => {
      void dual(
        (token) => productApi.setCapability(token, key, enabled),
        (prev) => ({
          ...prev,
          capabilities: prev.capabilities.map((c) =>
            c.key === key ? { ...c, enabled } : c,
          ),
        }),
      );
    },
    [dual],
  );

  const setApproval = useCallback<OrgniContextValue["setApproval"]>(
    (key, level) => {
      void dual(
        (token) => productApi.setApproval(token, key, level),
        (prev) => ({
          ...prev,
          approvals: prev.approvals.map((a) =>
            a.key === key ? { ...a, level } : a,
          ),
        }),
      );
    },
    [dual],
  );

  const setPermissionLevel = useCallback<OrgniContextValue["setPermissionLevel"]>(
    (key, level) => {
      void dual(
        (token) => productApi.setPermission(token, { key, level }),
        (prev) => ({
          ...prev,
          permissions: {
            ...prev.permissions,
            access: prev.permissions.access.map((a) =>
              a.key === key ? { ...a, level } : a,
            ),
          },
        }),
      );
    },
    [dual],
  );

  const setAudience = useCallback<OrgniContextValue["setAudience"]>(
    (audience) => {
      void dual(
        (token) => productApi.setPermission(token, { audience }),
        (prev) => ({ ...prev, permissions: { ...prev.permissions, audience } }),
      );
    },
    [dual],
  );

  const installTeams = useCallback<OrgniContextValue["installTeams"]>(async () => {
    patch((prev) => ({ ...prev, teams: { ...prev.teams, state: "installing" } }));
    await wait(1400);
    await dual(
      (token) => productApi.installTeams(token),
      (prev) => ({
        ...prev,
        teams: {
          state: "installed",
          mode: "mock",
          installedAt: new Date().toISOString(),
        },
      }),
    );
  }, [dual, patch]);

  const addMember = useCallback<OrgniContextValue["addMember"]>(
    async (email, role) => {
      await dual(
        (token) => productApi.addMember(token, email, role),
        (prev) =>
          prev.members.some((m) => m.email === email.toLowerCase())
            ? prev
            : {
                ...prev,
                members: [
                  ...prev.members,
                  {
                    email: email.toLowerCase(),
                    name: "",
                    role: role ?? "member",
                    status: "invited",
                    avatar: null,
                    addedAt: new Date().toISOString(),
                  },
                ],
              },
      );
    },
    [dual],
  );

  const updateMember = useCallback<OrgniContextValue["updateMember"]>(
    async (email, patchInput) => {
      await dual(
        (token) => productApi.updateMember(token, email, patchInput),
        (prev) => ({
          ...prev,
          members: prev.members.map((m) =>
            m.email === email.toLowerCase()
              ? {
                  ...m,
                  name: patchInput.name ?? m.name,
                  role: patchInput.role ?? m.role,
                  avatar:
                    patchInput.avatar === undefined ? m.avatar : patchInput.avatar,
                }
              : m,
          ),
        }),
      );
    },
    [dual],
  );

  const removeMember = useCallback<OrgniContextValue["removeMember"]>(
    (email) => {
      void dual(
        (token) => productApi.removeMember(token, email),
        (prev) => ({
          ...prev,
          members: prev.members.filter((m) => m.email !== email.toLowerCase()),
        }),
      );
    },
    [dual],
  );

  const resolveApproval = useCallback<OrgniContextValue["resolveApproval"]>(
    (id, approve) => {
      void dual(
        (token) => productApi.resolveActivity(token, id, approve),
        (prev) => ({
          ...prev,
          activity: prev.activity.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: approve ? "completed" : "rejected",
                  result: approve
                    ? "Approved and carried out."
                    : "Rejected — no action taken.",
                }
              : a,
          ),
        }),
      );
    },
    [dual],
  );

  const logAction = useCallback<OrgniContextValue["logAction"]>(
    (action) => {
      patch((prev) => ({
        ...prev,
        activity: [
          {
            ...action,
            id: `act_${Date.now().toString(36)}`,
            at: new Date().toISOString(),
          },
          ...prev.activity,
        ],
      }));
    },
    [patch],
  );

  const refresh = useCallback(() => {
    if (!usesServer.current || !session) return;
    void productApi
      .getState(session.token)
      .then((next) => setState((prev) => mergeServer(prev, next)))
      .catch(() => {});
  }, [session]);

  const resetWorkspace = useCallback(() => {
    if (usesServer.current && session) {
      void productApi
        .reset(session.token)
        .then((next) => setState(() => ({ ...initialState(), ...mergeServer(initialState(), next) })))
        .catch(() => {});
    }
    clearState(tenantId);
    setState(initialState());
  }, [tenantId, session]);

  const usingDemoData =
    !backendConnected && state.knowledge.counts.documents > 0;

  const value = useMemo<OrgniContextValue>(
    () => ({
      state,
      backendConnected,
      loading,
      usingDemoData,
      createOrganisation,
      setOnboardingStep,
      completeOnboarding,
      connect,
      disconnect,
      addFiles,
      startLearning,
      setCapability,
      setApproval,
      setPermissionLevel,
      setAudience,
      installTeams,
      addMember,
      updateMember,
      removeMember,
      resolveApproval,
      logAction,
      refresh,
      resetWorkspace,
    }),
    [
      state,
      backendConnected,
      loading,
      usingDemoData,
      createOrganisation,
      setOnboardingStep,
      completeOnboarding,
      connect,
      disconnect,
      addFiles,
      startLearning,
      setCapability,
      setApproval,
      setPermissionLevel,
      setAudience,
      installTeams,
      addMember,
      updateMember,
      removeMember,
      resolveApproval,
      logAction,
      refresh,
      resetWorkspace,
    ],
  );

  return <OrgniContext.Provider value={value}>{children}</OrgniContext.Provider>;
}

function demoKnowledgeIfEmpty(prev: OrgniState): { knowledge: KnowledgeSummary } {
  const enriched = demoEnrichment(prev);
  return { knowledge: enriched.knowledge };
}

export function useOrgni(): OrgniContextValue {
  const ctx = useContext(OrgniContext);
  if (!ctx) throw new Error("useOrgni must be used within OrgniProvider");
  return ctx;
}
