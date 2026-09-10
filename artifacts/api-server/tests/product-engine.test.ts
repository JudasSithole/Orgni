/**
 * Engine + product-store behaviour (in-memory store, no DB, no Teams).
 *
 * Covers the two gates the Teams bot depends on:
 *  - capability gate: a disabled capability declines the request
 *  - approval gate: an action that changes the outside world with a non-"none"
 *    policy is held for approval, and resolving it completes/rejects
 */
import { beforeEach, describe, expect, it } from "vitest";
import { __resetProductStore, getProductStore } from "../src/product/store.js";
import { processRequest, resolveAction } from "../src/product/engine.js";

const TENANT = "tenant_test_engine";

beforeEach(async () => {
  __resetProductStore();
  const store = getProductStore();
  const state = await store.getState(TENANT);
  state.organisation = {
    tenantId: TENANT,
    name: "Test Co",
    workEmail: "a@test.co",
    website: "",
    onboardingStep: 7,
    onboardingComplete: true,
    createdAt: new Date().toISOString(),
  };
  await store.putState(TENANT, state);
});

describe("engine capability gate", () => {
  it("declines when the capability is disabled", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "send an email to the client about the delay",
    });
    expect(res.action.status).toBe("rejected");
    expect(res.needsApproval).toBe(false);
    expect(res.reply).toMatch(/turned off/i);
  });

  it("completes an allowed, no-approval capability", async () => {
    const res = await processRequest({
      tenantId: TENANT,
      text: "prepare everything for tomorrow's client meeting",
    });
    expect(res.action.status).toBe("completed");
    expect(res.action.capability).toBe("prepare_work");
  });
});

describe("engine approval gate", () => {
  it("holds an external action for approval, then completes on approve", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "send_emails" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "send an email to the supplier",
      requestedBy: "Sam",
    });
    expect(res.needsApproval).toBe(true);
    expect(res.action.status).toBe("awaiting_approval");
    expect(res.action.approval?.kind).toBe("email");

    const approved = await resolveAction(TENANT, res.action.id, true);
    expect(approved?.status).toBe("completed");

    const after = await store.getState(TENANT);
    expect(after.activity.find((a) => a.id === res.action.id)?.status).toBe(
      "completed",
    );
  });

  it("respects an 'always' policy for financial actions", async () => {
    const store = getProductStore();
    const state = await store.getState(TENANT);
    state.capabilities = state.capabilities.map((c) =>
      c.key === "financial_actions" ? { ...c, enabled: true } : c,
    );
    await store.putState(TENANT, state);

    const res = await processRequest({
      tenantId: TENANT,
      text: "pay invoice 4821",
    });
    expect(res.needsApproval).toBe(true);
    expect(res.action.approval?.kind).toBe("financial");
  });
});
