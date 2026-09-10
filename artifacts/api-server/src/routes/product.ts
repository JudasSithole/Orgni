/**
 * Product / control-centre API.
 *
 * Backs the Orgni web app (onboarding + control centre) and is the source of
 * truth the Teams bot reads. All routes are tenant-scoped via `req.principal`.
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { config } from "../lib/config";
import { getProductStore, emptyState } from "../product/store";
import { CONNECTION_CATALOG } from "../product/defaults";
import { processRequest, resolveAction } from "../product/engine";
import { sendMemberInvite } from "../lib/email";
import type { OrgniState } from "../product/types";

const router: IRouter = Router();

function tenant(req: Request): string | null {
  return req.principal?.tenantId ?? null;
}

async function withState(
  req: Request,
  res: Response,
  fn: (state: OrgniState, tenantId: string) => Promise<OrgniState | void> | OrgniState | void,
): Promise<void> {
  const tid = tenant(req);
  if (!tid) {
    res.status(400).json({ error: "missing_tenant" });
    return;
  }
  const store = getProductStore();
  const state = await store.getState(tid);
  const next = await fn(state, tid);
  if (next) await store.putState(tid, next);
  res.json(await store.getState(tid));
}

/** GET /api/product/state — the whole control-centre state for this tenant. */
router.get("/product/state", async (req, res) => {
  const tid = tenant(req);
  if (!tid) {
    res.status(400).json({ error: "missing_tenant" });
    return;
  }
  const store = getProductStore();
  res.json({ ...(await store.getState(tid)), durable: store.durable });
});

/** POST /api/product/organisation — create or update the organisation. */
router.post("/product/organisation", async (req, res) => {
  const { name, workEmail, website } = req.body ?? {};
  if (!name || !workEmail) {
    res.status(400).json({ error: "name_and_email_required" });
    return;
  }
  await withState(req, res, (state, tid) => {
    state.organisation = {
      tenantId: tid,
      name: String(name).trim(),
      workEmail: String(workEmail).trim(),
      website: String(website ?? "").trim(),
      onboardingStep: Math.max(1, state.organisation?.onboardingStep ?? 0),
      onboardingComplete: state.organisation?.onboardingComplete ?? false,
      createdAt: state.organisation?.createdAt ?? new Date().toISOString(),
    };
    // The signed-in creator becomes the owner.
    const me = req.principal?.sub;
    if (me && !state.members.some((m) => m.email === me)) {
      state.members = [
        {
          email: me,
          name: "",
          role: "owner",
          status: "active",
          avatar: null,
          addedAt: new Date().toISOString(),
        },
        ...state.members,
      ];
    }
    return state;
  });
});

/* ---- members --------------------------------------------------- */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_AVATAR_BYTES = 400_000;

/** POST /api/product/members — invite by email. { email, name?, role? } */
router.post("/product/members", async (req, res) => {
  const email = String(req.body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    res.status(400).json({ error: "invalid_email" });
    return;
  }
  const role = ["owner", "admin", "member"].includes(req.body?.role)
    ? req.body.role
    : "member";
  const tid = tenant(req);
  let added = false;
  await withState(req, res, (state) => {
    if (state.members.some((m) => m.email === email)) return;
    added = true;
    state.members = [
      ...state.members,
      {
        email,
        name: String(req.body?.name ?? "").trim(),
        role,
        status: "invited",
        avatar: null,
        addedAt: new Date().toISOString(),
      },
    ];
    return state;
  });
  if (added && tid) {
    const org = (await getProductStore().getState(tid)).organisation;
    void sendMemberInvite({
      to: email,
      organisationName: org?.name ?? "your organisation",
      invitedByEmail: req.principal?.sub ?? null,
    });
  }
});

/** PATCH /api/product/members/:email — { name?, role?, avatar? }.
 *  A member may edit their own name/avatar; role changes need owner/admin. */
router.patch("/product/members/:email", async (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase();
  const me = req.principal?.sub?.toLowerCase();
  const { name, role, avatar } = req.body ?? {};
  if (typeof avatar === "string" && avatar.length > MAX_AVATAR_BYTES) {
    res.status(413).json({ error: "avatar_too_large" });
    return;
  }
  await withState(req, res, (state) => {
    const caller = state.members.find((m) => m.email === me);
    const canManage = !caller || caller.role === "owner" || caller.role === "admin";
    let found = false;
    state.members = state.members.map((m) => {
      if (m.email !== email) return m;
      found = true;
      const isSelf = m.email === me;
      return {
        ...m,
        name: typeof name === "string" && (isSelf || canManage) ? name.trim() : m.name,
        avatar:
          avatar === null
            ? null
            : typeof avatar === "string" && isSelf
              ? avatar
              : m.avatar,
        role:
          typeof role === "string" && canManage && !isSelf
            ? (role as typeof m.role)
            : m.role,
        status: isSelf && m.status === "invited" ? "active" : m.status,
      };
    });
    // Let a signed-in user who isn't in the roster yet create their own record.
    if (!found && me === email) {
      state.members = [
        ...state.members,
        {
          email,
          name: typeof name === "string" ? name.trim() : "",
          role: "member",
          status: "active",
          avatar: typeof avatar === "string" ? avatar : null,
          addedAt: new Date().toISOString(),
        },
      ];
    }
    return state;
  });
});

/** DELETE /api/product/members/:email */
router.delete("/product/members/:email", async (req, res) => {
  const email = decodeURIComponent(req.params.email).toLowerCase();
  await withState(req, res, (state) => {
    state.members = state.members.filter((m) => m.email !== email);
    return state;
  });
});

/** PATCH /api/product/onboarding — advance / complete onboarding. */
router.patch("/product/onboarding", async (req, res) => {
  const { step, complete } = req.body ?? {};
  await withState(req, res, (state) => {
    if (!state.organisation) return;
    if (typeof step === "number") {
      state.organisation.onboardingStep = Math.max(
        state.organisation.onboardingStep,
        step,
      );
    }
    if (complete === true) {
      state.organisation.onboardingComplete = true;
      state.organisation.onboardingStep = 7;
    }
    return state;
  });
});

/** POST /api/product/connections — connect a catalogue system. */
router.post("/product/connections", async (req, res) => {
  const key = String(req.body?.key ?? "");
  const entry = CONNECTION_CATALOG.find((c) => c.key === key);
  if (!entry) {
    res.status(404).json({ error: "unknown_connection" });
    return;
  }
  await withState(req, res, (state) => {
    state.connections = [
      ...state.connections.filter((c) => c.key !== key),
      {
        ...entry,
        status: "connected",
        mode: "mock",
        connectedAt: new Date().toISOString(),
      },
    ];
    return state;
  });
});

/** DELETE /api/product/connections/:key */
router.delete("/product/connections/:key", async (req, res) => {
  await withState(req, res, (state) => {
    state.connections = state.connections.filter(
      (c) => c.key !== req.params.key && c.id !== req.params.key,
    );
    return state;
  });
});

/** PATCH /api/product/capabilities — { key, enabled } or { capabilities:[...] } */
router.patch("/product/capabilities", async (req, res) => {
  const { key, enabled, capabilities } = req.body ?? {};
  await withState(req, res, (state) => {
    if (Array.isArray(capabilities)) {
      const map = new Map(
        capabilities.map((c: { key: string; enabled: boolean }) => [c.key, c.enabled]),
      );
      state.capabilities = state.capabilities.map((c) =>
        map.has(c.key) ? { ...c, enabled: Boolean(map.get(c.key)) } : c,
      );
    } else if (typeof key === "string") {
      state.capabilities = state.capabilities.map((c) =>
        c.key === key ? { ...c, enabled: Boolean(enabled) } : c,
      );
    }
    return state;
  });
});

/** PATCH /api/product/approvals — { key, level } */
router.patch("/product/approvals", async (req, res) => {
  const { key, level } = req.body ?? {};
  if (!["none", "ask_first", "always"].includes(level)) {
    res.status(400).json({ error: "invalid_level" });
    return;
  }
  await withState(req, res, (state) => {
    state.approvals = state.approvals.map((a) =>
      a.key === key ? { ...a, level } : a,
    );
    return state;
  });
});

/** PATCH /api/product/permissions — { key?, level?, audience? } */
router.patch("/product/permissions", async (req, res) => {
  const { key, level, audience } = req.body ?? {};
  await withState(req, res, (state) => {
    if (typeof key === "string" && level) {
      state.permissions.access = state.permissions.access.map((a) =>
        a.key === key ? { ...a, level } : a,
      );
    }
    if (audience) state.permissions.audience = audience;
    return state;
  });
});

/** POST /api/product/teams/install — mock Teams install. */
router.post("/product/teams/install", async (req, res) => {
  await withState(req, res, (state) => {
    state.teams = {
      state: "installed",
      mode: "mock",
      installedAt: new Date().toISOString(),
    };
    return state;
  });
});

/** POST /api/product/activity/:id/resolve — { approve: boolean } */
router.post("/product/activity/:id/resolve", async (req, res) => {
  const tid = tenant(req);
  if (!tid) {
    res.status(400).json({ error: "missing_tenant" });
    return;
  }
  const updated = await resolveAction(
    tid,
    req.params.id,
    req.body?.approve === true,
  );
  if (!updated) {
    res.status(404).json({ error: "action_not_found" });
    return;
  }
  const store = getProductStore();
  res.json(await store.getState(tid));
});

/**
 * POST /api/product/ask — give Orgni work from the web console. Runs the same
 * engine the Teams bot uses and logs the result to Activity.
 *   body: { text: string }
 */
router.post("/product/ask", async (req, res) => {
  const tid = tenant(req);
  if (!tid) {
    res.status(400).json({ error: "missing_tenant" });
    return;
  }
  const text = String(req.body?.text ?? "").trim();
  if (!text) {
    res.status(400).json({ error: "text_required" });
    return;
  }
  const result = await processRequest({
    tenantId: tid,
    text,
    requestedBy: req.principal?.sub ?? null,
  });
  res.json(result);
});

/** POST /api/product/reset — clear this tenant's product state. Dev only. */
router.post("/product/reset", async (req, res) => {
  if (config.NODE_ENV === "production") {
    res.status(404).json({ error: "not_found" });
    return;
  }
  const tid = tenant(req);
  if (!tid) {
    res.status(400).json({ error: "missing_tenant" });
    return;
  }
  const store = getProductStore();
  await store.putState(tid, emptyState());
  res.json(await store.getState(tid));
});

export default router;
