/**
 * The Orgni Teams bot.
 *
 * Every message goes through the same resolution chain before Orgni ever
 * touches business data:
 *
 *   Microsoft tenant (from the activity) → microsoft_connections (unique)
 *     → Orgni tenant id → external_identities (per Microsoft tenant+user)
 *     → Orgni member → engine.processRequest(tenantId, ...)
 *
 * No step falls back to guessing an organisation from an email domain or any
 * client-supplied value — an unresolved tenant or user is denied, not assumed.
 * `processRequest` (and everything it calls) is scoped by the tenantId this
 * chain produces, so retrieval can't cross an organisation boundary.
 */
import {
  CardFactory,
  TeamsActivityHandler,
  TeamsInfo,
  TurnContext,
  type Activity,
} from "botbuilder";
import { logger } from "../lib/logger";
import { getProductStore } from "../product/store";
import { processRequest, resolveAction } from "../product/engine";
import {
  getMicrosoftIdentityStore,
  type TeamsAuditOutcome,
} from "../product/microsoft-identity";

const WELCOME =
  "Hi — I'm Orgni. Mention me with **@Orgni** and tell me what you need: " +
  "*\"@Orgni what's blocking shipment OLX-4821?\"*, " +
  "*\"@Orgni why hasn't this invoice been approved?\"*. " +
  "Your admin controls what I can do and see from the Orgni web app.";

const NOT_CONNECTED =
  "Your organisation hasn't connected Orgni to Microsoft Teams yet. " +
  "Ask an admin to finish setup in Orgni → Settings → Teams.";

const NOT_AUTHORIZED =
  "I don't have you set up in Orgni yet. Ask an admin to add you under " +
  "Settings → Members, then try again.";

/** Pull the Microsoft (Entra/AAD) tenant id out of a Teams activity. */
export function microsoftTenantOf(activity: Partial<Activity>): string | null {
  return (
    (activity.channelData as { tenant?: { id?: string } } | undefined)?.tenant?.id ??
    activity.conversation?.tenantId ??
    null
  );
}

/**
 * Whether an unrecognised Microsoft user may be auto-provisioned as an Orgni
 * member. Only "all employees" opens the door automatically — every other
 * audience scope requires an admin to have already added the person under
 * Settings → Members (specific_departments / specific_teams have no separate
 * department/team data yet, so they're treated the same as specific_users:
 * restricted to people already on the roster).
 */
export function canAutoProvision(
  audience: string,
  hasExistingMember: boolean,
): boolean {
  return hasExistingMember || audience === "all_employees";
}

export class OrgniBot extends TeamsActivityHandler {
  constructor() {
    super();

    this.onMembersAdded(async (context, next) => {
      const added = context.activity.membersAdded ?? [];
      const botId = context.activity.recipient?.id;
      if (added.some((m) => m.id !== botId)) {
        await context.sendActivity(WELCOME);
      }
      await next();
    });

    this.onMessage(async (context, next) => {
      try {
        await this.handleMessage(context);
      } catch (err) {
        logger.error({ err }, "teams: message handling failed");
        await getMicrosoftIdentityStore().logAudit({
          tenantId: null,
          microsoftTenantId: microsoftTenantOf(context.activity),
          conversationId: context.activity.conversation?.id ?? null,
          activityId: context.activity.id ?? null,
          question: context.activity.text ?? null,
          outcome: "error",
        });
        await context.sendActivity(
          "Something went wrong on my side answering that. Please try again in a moment.",
        );
      }
      await next();
    });
  }

  private async handleMessage(context: TurnContext) {
    const activity = context.activity;
    const identityStore = getMicrosoftIdentityStore();

    // Adaptive Card submit (approve / reject) — still requires tenant + user
    // resolution below, so this falls through to the same pipeline.
    const cardValue = activity.value as { action?: string; actionId?: string } | undefined;

    // --- Idempotency: Bot Framework can redeliver the same activity. ---
    const microsoftTenantId = microsoftTenantOf(activity);
    if (activity.id && microsoftTenantId) {
      const isNew = await identityStore.markProcessed(microsoftTenantId, activity.id);
      if (!isNew) {
        logger.info({ activityId: activity.id }, "teams: duplicate activity ignored");
        return;
      }
    }

    // --- 1. Resolve the Microsoft tenant → Orgni organisation. ---
    if (!microsoftTenantId) {
      await context.sendActivity(NOT_CONNECTED);
      return;
    }
    const tenantId = await identityStore.resolveOrgTenant(microsoftTenantId);
    if (!tenantId) {
      await context.sendActivity(NOT_CONNECTED);
      await identityStore.logAudit({
        tenantId: null,
        microsoftTenantId,
        conversationId: activity.conversation?.id ?? null,
        activityId: activity.id ?? null,
        question: activity.text ?? null,
        outcome: "denied_unlinked_tenant",
      });
      return;
    }

    // --- 2. Resolve (or provision) the Microsoft user → Orgni member. ---
    const entraObjectId = activity.from?.aadObjectId ?? null;
    if (!entraObjectId) {
      await context.sendActivity(NOT_AUTHORIZED);
      await identityStore.logAudit({
        tenantId,
        microsoftTenantId,
        conversationId: activity.conversation?.id ?? null,
        activityId: activity.id ?? null,
        outcome: "denied_unauthorized",
      });
      return;
    }
    const identity = await this.resolveOrUser(context, tenantId, microsoftTenantId, entraObjectId);
    if (!identity) {
      await context.sendActivity(NOT_AUTHORIZED);
      await identityStore.logAudit({
        tenantId,
        microsoftTenantId,
        entraObjectId,
        conversationId: activity.conversation?.id ?? null,
        activityId: activity.id ?? null,
        outcome: "denied_unauthorized",
      });
      return;
    }

    // Remember the conversation (audit + future proactive messages).
    await this.rememberConversation(tenantId, microsoftTenantId, context);

    // --- Approval card submit ---
    if (cardValue?.action === "approve" || cardValue?.action === "reject") {
      await this.handleApproval(context, tenantId, cardValue.action === "approve", cardValue.actionId);
      return;
    }

    // --- 3. Clean the mention and run the question through Orgni Core. ---
    const text = TurnContext.removeRecipientMention(activity)?.trim() || "";
    if (!text) {
      await context.sendActivity(WELCOME);
      return;
    }

    await context.sendActivity({ type: "typing" });
    const result = await processRequest({
      tenantId, // the ONLY organisation this request may ever touch
      text,
      requestedBy: identity.email ?? identity.displayName ?? "A Teams user",
      source: "microsoft_teams",
      conversationRef: TurnContext.getConversationReference(activity),
    });

    let outcome: TeamsAuditOutcome = "answered";
    if (result.needsApproval && result.action.approval) {
      outcome = "awaiting_approval";
      await context.sendActivity({
        attachments: [
          approvalCard(result.action.id, result.action.title, result.action.approval),
        ],
      });
      await context.sendActivity(result.reply);
    } else {
      if (result.action.status === "rejected") outcome = "denied_capability";
      await context.sendActivity(result.reply);
    }

    await identityStore.logAudit({
      tenantId,
      microsoftTenantId,
      entraObjectId,
      conversationId: activity.conversation?.id ?? null,
      activityId: activity.id ?? null,
      question: text,
      outcome,
      sourcesUsed: result.action.sourcesUsed,
      orgniActionId: result.action.id,
    });
  }

  /**
   * Resolve an existing external identity, or provision one. Provisioning
   * only happens automatically when the organisation's audience is set to
   * "all employees" — any other scope requires an admin to have already
   * added the person under Settings → Members.
   */
  private async resolveOrUser(
    context: TurnContext,
    tenantId: string,
    microsoftTenantId: string,
    entraObjectId: string,
  ) {
    const identityStore = getMicrosoftIdentityStore();
    const existing = await identityStore.resolveIdentity(microsoftTenantId, entraObjectId);
    if (existing) return existing;

    // First time we've seen this Microsoft user — look up their profile.
    let email: string | null = null;
    let displayName: string | null = context.activity.from?.name ?? null;
    const fromId = context.activity.from?.id;
    if (fromId) {
      try {
        const profile = await TeamsInfo.getMember(context, fromId);
        email = (profile.email || profile.userPrincipalName || "").toLowerCase() || null;
        displayName = profile.name || displayName;
      } catch (err) {
        logger.warn({ err }, "teams: could not read Teams member profile");
      }
    }

    const productStore = getProductStore();
    const state = await productStore.getState(tenantId);
    const audience = state.permissions.audience;
    const existingMember = email
      ? state.members.find((m) => m.email === email)
      : undefined;

    if (!canAutoProvision(audience, Boolean(existingMember))) {
      // Restricted audience and this person hasn't been added — deny.
      return null;
    }

    if (!existingMember) {
      state.members = [
        ...state.members,
        {
          email: email ?? `${entraObjectId}@teams.local`,
          name: displayName ?? "",
          role: "member",
          status: "active",
          avatar: null,
          addedAt: new Date().toISOString(),
        },
      ];
      await productStore.putState(tenantId, state);
    } else if (existingMember.status === "invited") {
      existingMember.status = "active";
      await productStore.putState(tenantId, state);
    }

    const identity = {
      tenantId,
      microsoftTenantId,
      entraObjectId,
      email: email ?? existingMember?.email ?? null,
      displayName,
    };
    await identityStore.upsertIdentity(identity);
    return identity;
  }

  private async handleApproval(
    context: TurnContext,
    tenantId: string,
    approve: boolean,
    actionId?: string,
  ) {
    if (!actionId) {
      await context.sendActivity("I couldn't find that request any more.");
      return;
    }
    const updated = await resolveAction(tenantId, actionId, approve);
    await context.sendActivity(
      updated
        ? approve
          ? `Approved — ${updated.title.toLowerCase()} is done.`
          : `Rejected — I won't ${updated.title.toLowerCase()}.`
        : "That request has already been dealt with.",
    );
  }

  private async rememberConversation(
    tenantId: string,
    microsoftTenantId: string,
    context: TurnContext,
  ) {
    try {
      const store = getProductStore();
      const state = await store.getState(tenantId);
      state.teams = { ...state.teams, mode: "live" };
      await store.putState(tenantId, state);

      const activity = context.activity;
      await getMicrosoftIdentityStore().recordConversation({
        tenantId,
        microsoftTenantId,
        conversationId: activity.conversation?.id ?? "",
        conversationType: activity.conversation?.conversationType ?? null,
        teamId: (activity.channelData as { team?: { id?: string } } | undefined)?.team?.id,
        channelId: (activity.channelData as { channel?: { id?: string } } | undefined)?.channel
          ?.id,
        serviceUrl: activity.serviceUrl,
      });
    } catch (err) {
      logger.warn({ err }, "teams: could not persist conversation reference");
    }
  }
}

function approvalCard(
  actionId: string,
  title: string,
  approval: { kind: string; fields: { label: string; value: string }[] },
) {
  return CardFactory.adaptiveCard({
    $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
    type: "AdaptiveCard",
    version: "1.4",
    body: [
      { type: "TextBlock", text: "Orgni needs your approval", weight: "Bolder", size: "Medium" },
      { type: "TextBlock", text: title, wrap: true, spacing: "Small" },
      {
        type: "FactSet",
        facts: approval.fields.map((f) => ({ title: f.label, value: f.value })),
      },
    ],
    actions: [
      { type: "Action.Submit", title: "Approve", data: { action: "approve", actionId } },
      { type: "Action.Submit", title: "Reject", data: { action: "reject", actionId } },
    ],
  });
}

export const orgniBot = new OrgniBot();
