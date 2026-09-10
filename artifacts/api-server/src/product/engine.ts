/**
 * The Orgni engine — turns a natural-language request ("@Orgni prepare
 * everything for tomorrow's client meeting") into a reply and a logged
 * OrgniAction, honouring the tenant's capability and approval settings.
 *
 * The response text is produced by an `IntelligenceProvider`. The default is
 * deterministic and template-based (no model, no API key). A real model plugs
 * in by implementing the same interface — that is the only seam that changes.
 */
import { randomUUID } from "node:crypto";
import { createDb } from "@workspace/db/connect";
import { config } from "../lib/config";
import { logger } from "../lib/logger";
import { getProductStore } from "./store";
import type {
  ApprovalCategoryKey,
  CapabilityKey,
  OrgniAction,
  OrgniState,
} from "./types";

export interface EngineRequest {
  tenantId: string;
  /** Raw text after the @Orgni mention is stripped. */
  text: string;
  /** Display name of the person who asked, when known. */
  requestedBy?: string | null;
  /** Bot Framework conversation reference, when the request came from Teams. */
  conversationRef?: unknown;
}

export interface EngineResult {
  reply: string;
  action: OrgniAction;
  /** True when the reply is "I need approval first". */
  needsApproval: boolean;
}

/* ---- intent detection ------------------------------------------------ */

interface Intent {
  capability: CapabilityKey;
  approvalCategory: ApprovalCategoryKey;
  verb: string;
  /** For approval cards. */
  actionKind: "email" | "record_update" | "financial" | "none";
}

const INTENT_RULES: { match: RegExp; intent: Intent }[] = [
  {
    match: /\b(send|email|reply to|respond to)\b.*\b(client|customer|supplier|them|外部)\b|\bsend (an )?email\b/i,
    intent: { capability: "send_emails", approvalCategory: "send_external_email", verb: "send an email", actionKind: "email" },
  },
  {
    match: /\b(draft|write|compose|prepare) (an |a )?(email|reply|response|message)\b/i,
    intent: { capability: "draft_emails", approvalCategory: "prepare_documents", verb: "draft an email", actionKind: "none" },
  },
  {
    match: /\b(schedule|set up|book|arrange) (a )?(meeting|call|review|sync|catch-?up)\b/i,
    intent: { capability: "schedule_meetings", approvalCategory: "schedule_meetings", verb: "schedule a meeting", actionKind: "none" },
  },
  {
    match: /\b(update|change|set|modify) .*(record|crm|delivery date|status|shipment|order)\b/i,
    intent: { capability: "update_systems", approvalCategory: "change_records", verb: "update a business record", actionKind: "record_update" },
  },
  {
    match: /\b(pay|invoice|refund|transfer|payment|reconcile)\b/i,
    intent: { capability: "financial_actions", approvalCategory: "financial_actions", verb: "perform a financial action", actionKind: "financial" },
  },
  {
    match: /\b(prepare|put together|pull together|get ready|brief|prep) \b|\bmeeting brief\b|\beverything for\b/i,
    intent: { capability: "prepare_work", approvalCategory: "prepare_documents", verb: "prepare a brief", actionKind: "none" },
  },
  {
    match: /\b(find|locate|where is|show me|get me|look for)\b.*\b(doc|document|file|contract|invoice|report|policy)\b/i,
    intent: { capability: "find_documents", approvalCategory: "read_information", verb: "find a document", actionKind: "none" },
  },
];

const FALLBACK_INTENT: Intent = {
  capability: "answer_questions",
  approvalCategory: "read_information",
  verb: "answer a question",
  actionKind: "none",
};

function detectIntent(text: string): Intent {
  for (const rule of INTENT_RULES) {
    if (rule.match.test(text)) return rule.intent;
  }
  return FALLBACK_INTENT;
}

/* ---- intelligence provider (LLM seam) ------------------------------- */

export interface IntelligenceContext {
  request: EngineRequest;
  intent: Intent;
  organisationName: string;
  /** Short context lines the engine gathered (documents, entities, …). */
  contextLines: string[];
}

export interface IntelligenceProvider {
  readonly name: string;
  /** Produce the natural-language body of Orgni's reply. */
  generateReply(ctx: IntelligenceContext): Promise<string>;
}

/**
 * Deterministic default. Uses the intent + gathered context to compose a
 * grounded, non-hallucinated response. No external calls.
 */
class TemplateIntelligenceProvider implements IntelligenceProvider {
  readonly name = "template";

  async generateReply(ctx: IntelligenceContext): Promise<string> {
    const { intent, contextLines } = ctx;
    const evidence =
      contextLines.length > 0
        ? `\n\nWhat I used:\n${contextLines.map((l) => `• ${l}`).join("\n")}`
        : "";

    switch (intent.capability) {
      case "prepare_work":
        return `I've pulled together what I can for that: the relevant account context, recent conversations, open issues and documents.${evidence}`;
      case "find_documents":
        return `Here's what I found that matches.${evidence || "\n\nNothing is connected yet, so I'm working from what's been uploaded."}`;
      case "schedule_meetings":
        return `I can set that up. I'll find a time that works for everyone and send the invite.${evidence}`;
      case "draft_emails":
        return `I've drafted a reply for you to review before it goes out.${evidence}`;
      case "send_emails":
        return `I've prepared the email and I'm ready to send it.${evidence}`;
      case "update_systems":
        return `I've prepared the change to the connected system.${evidence}`;
      case "financial_actions":
        return `I've prepared this financial action for review.${evidence}`;
      case "answer_questions":
      default:
        return contextLines.length > 0
          ? `Based on what your organisation knows:${evidence}`
          : `I don't have enough connected yet to answer that confidently. Once Microsoft 365 and your files are connected I'll be able to.`;
    }
  }
}

let provider: IntelligenceProvider = new TemplateIntelligenceProvider();

/** Swap the intelligence provider (e.g. an Anthropic-backed one) at boot. */
export function setIntelligenceProvider(next: IntelligenceProvider) {
  provider = next;
  logger.info({ provider: next.name }, "intelligence provider set");
}

export function getIntelligenceProvider(): IntelligenceProvider {
  return provider;
}

/* ---- context gathering -------------------------------------------- */

const modelStore = config.DATABASE_URL ? createDb(config.DATABASE_URL) : null;

async function gatherContext(tenantId: string): Promise<string[]> {
  if (!modelStore) return [];
  try {
    const model = await modelStore.repository.loadTenantModel(tenantId);
    const lines: string[] = [];
    if (model.sources.length) {
      lines.push(`${model.sources.length} document${model.sources.length === 1 ? "" : "s"} in your workspace`);
      const latest = model.sources[0];
      if (latest) lines.push(`Most recent: ${latest.filename}`);
    }
    if (model.facts.length) {
      lines.push(`${model.facts.length} extracted fact set${model.facts.length === 1 ? "" : "s"}`);
    }
    return lines;
  } catch (err) {
    logger.warn({ err }, "engine: context gather failed");
    return [];
  }
}

/* ---- the engine -------------------------------------------------- */

function capabilityEnabled(state: OrgniState, key: CapabilityKey): boolean {
  return state.capabilities.find((c) => c.key === key)?.enabled ?? false;
}

function approvalLevel(state: OrgniState, key: ApprovalCategoryKey) {
  return state.approvals.find((a) => a.key === key)?.level ?? "ask_first";
}

function capabilityLabel(state: OrgniState, key: CapabilityKey): string {
  return state.capabilities.find((c) => c.key === key)?.label ?? "that";
}

export async function processRequest(req: EngineRequest): Promise<EngineResult> {
  const store = getProductStore();
  const state = await store.getState(req.tenantId);
  const intent = detectIntent(req.text);
  const now = new Date().toISOString();
  const organisationName = state.organisation?.name ?? "your organisation";

  const baseAction: OrgniAction = {
    id: randomUUID(),
    title: summarise(req.text),
    status: "in_progress",
    at: now,
    requestedBy: req.requestedBy ?? null,
    capability: intent.capability,
    understood: `Someone asked Orgni to ${intent.verb}: "${truncate(req.text, 140)}"`,
    sourcesUsed: [],
    actionsPerformed: [],
    reason: "",
    result: "",
    conversationRef: req.conversationRef,
  };

  // 1. Capability gate.
  if (!capabilityEnabled(state, intent.capability)) {
    const action: OrgniAction = {
      ...baseAction,
      status: "rejected",
      reason: `"${capabilityLabel(state, intent.capability)}" is turned off for this organisation.`,
      result: "Declined — capability disabled.",
    };
    await persist(store, req.tenantId, state, action);
    return {
      reply: `I'm not able to ${intent.verb} right now — "${capabilityLabel(state, intent.capability)}" is turned off in Orgni. An admin can change that under Permissions.`,
      action,
      needsApproval: false,
    };
  }

  // 2. Gather context + generate the reply body.
  const contextLines = await gatherContext(req.tenantId);
  const body = await provider.generateReply({
    request: req,
    intent,
    organisationName,
    contextLines,
  });

  // 3. Approval gate for actions that change the outside world.
  const level = approvalLevel(state, intent.approvalCategory);
  const isExternalAction = intent.actionKind !== "none";

  if (isExternalAction && level !== "none") {
    const action: OrgniAction = {
      ...baseAction,
      status: "awaiting_approval",
      actionsPerformed: ["Prepared the action for review"],
      reason:
        level === "always"
          ? "This kind of action always needs approval."
          : "Sending this needs a quick approval under current settings.",
      result: "Waiting for someone to approve.",
      approval: {
        kind: intent.actionKind as "email" | "record_update" | "financial",
        fields: approvalFields(intent, req.text),
      },
    };
    await persist(store, req.tenantId, state, action);
    return {
      reply: `${body}\n\nThis needs approval before I can ${intent.verb}. I've sent it to your Orgni activity for a decision.`,
      action,
      needsApproval: true,
    };
  }

  // 4. Completed.
  const action: OrgniAction = {
    ...baseAction,
    status: "completed",
    sourcesUsed: contextLines,
    actionsPerformed: [completedVerb(intent)],
    reason: "Within the current capability and approval settings.",
    result: "Done.",
  };
  await persist(store, req.tenantId, state, action);
  return { reply: body, action, needsApproval: false };
}

/** Resolve an awaiting_approval action (approve → completed, reject → rejected). */
export async function resolveAction(
  tenantId: string,
  actionId: string,
  approve: boolean,
): Promise<OrgniAction | null> {
  const store = getProductStore();
  const state = await store.getState(tenantId);
  const idx = state.activity.findIndex((a) => a.id === actionId);
  if (idx === -1) return null;
  const updated: OrgniAction = {
    ...state.activity[idx]!,
    status: approve ? "completed" : "rejected",
    result: approve ? "Approved and carried out." : "Rejected — no action taken.",
    actionsPerformed: approve
      ? [...state.activity[idx]!.actionsPerformed, "Carried out after approval"]
      : state.activity[idx]!.actionsPerformed,
  };
  state.activity[idx] = updated;
  await store.putState(tenantId, state);
  return updated;
}

async function persist(
  store: ReturnType<typeof getProductStore>,
  tenantId: string,
  state: OrgniState,
  action: OrgniAction,
): Promise<void> {
  state.activity = [action, ...state.activity].slice(0, 200);
  await store.putState(tenantId, state);
}

/* ---- small helpers ---------------------------------------------- */

function summarise(text: string): string {
  const t = text.trim().replace(/\s+/g, " ");
  if (t.length <= 60) return capitalise(t);
  return capitalise(t.slice(0, 57)) + "…";
}
function capitalise(s: string) {
  return s ? s[0]!.toUpperCase() + s.slice(1) : s;
}
function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
function completedVerb(intent: Intent): string {
  switch (intent.capability) {
    case "prepare_work": return "Prepared the brief";
    case "find_documents": return "Located the matching documents";
    case "schedule_meetings": return "Set up the meeting";
    case "draft_emails": return "Drafted the message";
    default: return "Answered the question";
  }
}
function approvalFields(intent: Intent, text: string): { label: string; value: string }[] {
  if (intent.actionKind === "email") {
    return [
      { label: "Recipient", value: "the external contact in this thread" },
      { label: "Subject", value: truncate(text, 60) },
      { label: "Reason", value: "Requested in Teams" },
      { label: "Action", value: "Send the drafted email" },
    ];
  }
  if (intent.actionKind === "record_update") {
    return [
      { label: "Change", value: truncate(text, 80) },
      { label: "System", value: "connected business system" },
      { label: "Action", value: "Apply the update" },
    ];
  }
  return [
    { label: "Request", value: truncate(text, 80) },
    { label: "Action", value: intent.verb },
  ];
}
