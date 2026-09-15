/**
 * Microsoft Teams identity resolution and tenant isolation.
 *
 * These are the tests that matter most for this integration: a Microsoft
 * tenant must resolve to exactly one Orgni organisation, an unresolved tenant
 * or user must be denied (never guessed), and nothing here should ever let
 * one organisation's request touch another's data.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  __resetMicrosoftIdentityStore,
  getMicrosoftIdentityStore,
} from "../src/product/microsoft-identity.js";
import { canAutoProvision, microsoftTenantOf } from "../src/teams/bot.js";
import { __resetProductStore, getProductStore } from "../src/product/store.js";
import { processRequest } from "../src/product/engine.js";

const ORG_A = "tenant_org_a";
const ORG_B = "tenant_org_b";
const MS_TENANT_A = "11111111-1111-1111-1111-111111111111";
const MS_TENANT_B = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  __resetMicrosoftIdentityStore();
  __resetProductStore();
});

describe("Microsoft tenant → Orgni organisation resolution", () => {
  it("resolves a known, linked tenant to the correct Orgni organisation", async () => {
    const store = getMicrosoftIdentityStore();
    const link = await store.linkTenant({
      orgniTenantId: ORG_A,
      microsoftTenantId: MS_TENANT_A,
      installedBy: "admin@org-a.com",
    });
    expect(link.ok).toBe(true);

    const resolved = await store.resolveOrgTenant(MS_TENANT_A);
    expect(resolved).toBe(ORG_A);
  });

  it("denies an unknown / unlinked Microsoft tenant", async () => {
    const store = getMicrosoftIdentityStore();
    const resolved = await store.resolveOrgTenant("never-linked-tenant-id");
    expect(resolved).toBeNull();
  });

  it("never lets a Microsoft tenant map to two Orgni organisations", async () => {
    const store = getMicrosoftIdentityStore();
    await store.linkTenant({
      orgniTenantId: ORG_A,
      microsoftTenantId: MS_TENANT_A,
      installedBy: "admin@org-a.com",
    });

    // Org B tries to claim the same Microsoft tenant that Org A already holds.
    const attempt = await store.linkTenant({
      orgniTenantId: ORG_B,
      microsoftTenantId: MS_TENANT_A,
      installedBy: "admin@org-b.com",
    });
    expect(attempt.ok).toBe(false);
    if (!attempt.ok) {
      expect(attempt.error).toBe("linked_to_other_org");
      expect(attempt.linkedTenantId).toBe(ORG_A);
    }

    // The original mapping is untouched.
    expect(await store.resolveOrgTenant(MS_TENANT_A)).toBe(ORG_A);
  });

  it("allows an organisation to reconnect (relink) its own Microsoft tenant", async () => {
    const store = getMicrosoftIdentityStore();
    await store.linkTenant({
      orgniTenantId: ORG_A,
      microsoftTenantId: MS_TENANT_A,
      installedBy: "admin@org-a.com",
    });
    const relink = await store.linkTenant({
      orgniTenantId: ORG_A,
      microsoftTenantId: MS_TENANT_A,
      installedBy: "someone-else@org-a.com",
    });
    expect(relink.ok).toBe(true);
    expect(await store.resolveOrgTenant(MS_TENANT_A)).toBe(ORG_A);
  });

  it("stops resolving once disconnected", async () => {
    const store = getMicrosoftIdentityStore();
    await store.linkTenant({
      orgniTenantId: ORG_A,
      microsoftTenantId: MS_TENANT_A,
      installedBy: "admin@org-a.com",
    });
    await store.unlink(ORG_A);
    expect(await store.resolveOrgTenant(MS_TENANT_A)).toBeNull();
  });

  it("keeps two organisations' connections fully independent", async () => {
    const store = getMicrosoftIdentityStore();
    await store.linkTenant({
      orgniTenantId: ORG_A,
      microsoftTenantId: MS_TENANT_A,
      installedBy: "admin@org-a.com",
    });
    await store.linkTenant({
      orgniTenantId: ORG_B,
      microsoftTenantId: MS_TENANT_B,
      installedBy: "admin@org-b.com",
    });
    expect(await store.resolveOrgTenant(MS_TENANT_A)).toBe(ORG_A);
    expect(await store.resolveOrgTenant(MS_TENANT_B)).toBe(ORG_B);
  });
});

describe("external identity resolution", () => {
  const ENTRA_USER = "aad-object-id-1234";

  it("resolves the same Microsoft user back to the same Orgni identity", async () => {
    const store = getMicrosoftIdentityStore();
    await store.upsertIdentity({
      tenantId: ORG_A,
      microsoftTenantId: MS_TENANT_A,
      entraObjectId: ENTRA_USER,
      email: "sarah@org-a.com",
      displayName: "Sarah",
    });

    const identity = await store.resolveIdentity(MS_TENANT_A, ENTRA_USER);
    expect(identity?.tenantId).toBe(ORG_A);
    expect(identity?.email).toBe("sarah@org-a.com");
  });

  it("returns null for a user that has never been seen", async () => {
    const store = getMicrosoftIdentityStore();
    const identity = await store.resolveIdentity(MS_TENANT_A, "unknown-user");
    expect(identity).toBeNull();
  });

  it("does not let the same Entra object id bleed across Microsoft tenants", async () => {
    const store = getMicrosoftIdentityStore();
    // The same person's object id can coincidentally collide across tenants
    // only in theory, but the lookup must still be scoped per Microsoft tenant.
    await store.upsertIdentity({
      tenantId: ORG_A,
      microsoftTenantId: MS_TENANT_A,
      entraObjectId: ENTRA_USER,
      email: "sarah@org-a.com",
      displayName: "Sarah",
    });
    const crossTenantLookup = await store.resolveIdentity(MS_TENANT_B, ENTRA_USER);
    expect(crossTenantLookup).toBeNull();
  });
});

describe("duplicate / replayed message handling", () => {
  it("processes an activity once and ignores redelivery", async () => {
    const store = getMicrosoftIdentityStore();
    const first = await store.markProcessed(MS_TENANT_A, "activity-1");
    const second = await store.markProcessed(MS_TENANT_A, "activity-1");
    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it("treats the same activity id under a different tenant independently", async () => {
    const store = getMicrosoftIdentityStore();
    expect(await store.markProcessed(MS_TENANT_A, "activity-1")).toBe(true);
    expect(await store.markProcessed(MS_TENANT_B, "activity-1")).toBe(true);
  });
});

describe("@Orgni mention / tenant extraction", () => {
  it("reads the Microsoft tenant id from Teams channelData", () => {
    const tenantId = microsoftTenantOf({
      channelData: { tenant: { id: MS_TENANT_A } },
    } as never);
    expect(tenantId).toBe(MS_TENANT_A);
  });

  it("falls back to conversation.tenantId when channelData is missing", () => {
    const tenantId = microsoftTenantOf({
      conversation: { tenantId: MS_TENANT_B } as never,
    } as never);
    expect(tenantId).toBe(MS_TENANT_B);
  });

  it("returns null when no tenant information is present at all", () => {
    expect(microsoftTenantOf({} as never)).toBeNull();
  });
});

describe("auto-provisioning policy", () => {
  it("auto-provisions on an 'all employees' audience", () => {
    expect(canAutoProvision("all_employees", false)).toBe(true);
  });

  it("denies an unrecognised user on a restricted audience", () => {
    expect(canAutoProvision("specific_users", false)).toBe(false);
    expect(canAutoProvision("specific_departments", false)).toBe(false);
    expect(canAutoProvision("specific_teams", false)).toBe(false);
  });

  it("still allows someone already on the roster, regardless of audience", () => {
    expect(canAutoProvision("specific_users", true)).toBe(true);
  });
});

describe("cross-tenant data isolation in the engine", () => {
  it("processing a request for one tenant never touches another tenant's state", async () => {
    const store = getProductStore();
    for (const tenantId of [ORG_A, ORG_B]) {
      const state = await store.getState(tenantId);
      state.organisation = {
        tenantId,
        name: tenantId,
        workEmail: "a@b.com",
        website: "",
        onboardingStep: 7,
        onboardingComplete: true,
        createdAt: new Date().toISOString(),
      };
      await store.putState(tenantId, state);
    }

    await processRequest({
      tenantId: ORG_A,
      text: "prepare everything for tomorrow's client meeting",
      requestedBy: "sarah@org-a.com",
      source: "microsoft_teams",
    });

    const orgAState = await store.getState(ORG_A);
    const orgBState = await store.getState(ORG_B);
    expect(orgAState.activity).toHaveLength(1);
    expect(orgBState.activity).toHaveLength(0);
    expect(orgAState.activity[0]?.source).toBe("microsoft_teams");
  });
});
