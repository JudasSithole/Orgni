/**
 * The Orgni Teams bot.
 *
 * On a message it strips the @Orgni mention, resolves which Orgni organisation
 * the Teams tenant maps to, runs the engine, and replies. Approvals come back
 * as an Adaptive Card with Approve / Reject buttons.
 */
import {
  CardFactory,
  TeamsActivityHandler,
  TurnContext,
  type Activity,
} from "botbuilder";
import { config } from "../lib/config";
import { logger } from "../lib/logger";
import { getProductStore } from "../product/store";
import { processRequest, resolveAction } from "../product/engine";

const WELCOME =
  "Hi — I'm Orgni. Mention me with **@Orgni** and tell me what you need: " +
  "*\"@Orgni prepare everything for tomorrow's client meeting\"*, " +
  "*\"@Orgni where is shipment OLX-4821?\"*. " +
  "Your admin controls what I can do from the Orgni web app.";

/** Map a Teams (AAD) tenant to an Orgni tenant id. */
async function resolveOrgniTenant(activity: Partial<Activity>): Promise<string | null> {
  if (config.TEAMS_DEFAULT_ORGNI_TENANT) return config.TEAMS_DEFAULT_ORGNI_TENANT;

  const aadTenant =
    // channelData.tenant.id is the reliable Teams value
    (activity.channelData as { tenant?: { id?: string } } | undefined)?.tenant?.id ??
    activity.conversation?.tenantId ??
    null;
  if (!aadTenant) return null;

  const store = getProductStore();
  for (const tid of await store.listTenantIds()) {
    const state = await store.getState(tid);
    if (state.organisation?.teamsAadTenantId === aadTenant) return tid;
  }
  return null;
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
      // Adaptive Card submit (approve / reject).
      const value = context.activity.value as
        | { action?: string; actionId?: string }
        | undefined;
      if (value?.action === "approve" || value?.action === "reject") {
        await this.handleApproval(context, value.action === "approve", value.actionId);
        await next();
        return;
      }

      const tenantId = await resolveOrgniTenant(context.activity);
      if (!tenantId) {
        await context.sendActivity(
          "This Microsoft 365 tenant isn't linked to an Orgni organisation yet. " +
            "Ask your admin to finish setup in the Orgni web app.",
        );
        await next();
        return;
      }

      const text = TurnContext.removeRecipientMention(context.activity)?.trim() || "";
      if (!text) {
        await context.sendActivity(WELCOME);
        await next();
        return;
      }

      // Remember where to post approval outcomes.
      await this.rememberConversation(tenantId, context);

      await context.sendActivity({ type: "typing" });
      const result = await processRequest({
        tenantId,
        text,
        requestedBy: context.activity.from?.name ?? null,
        conversationRef: TurnContext.getConversationReference(context.activity),
      });

      if (result.needsApproval && result.action.approval) {
        await context.sendActivity({
          attachments: [approvalCard(result.action.id, result.action.title, result.action.approval)],
        });
        await context.sendActivity(result.reply);
      } else {
        await context.sendActivity(result.reply);
      }
      await next();
    });
  }

  private async handleApproval(
    context: TurnContext,
    approve: boolean,
    actionId?: string,
  ) {
    const tenantId = await resolveOrgniTenant(context.activity);
    if (!tenantId || !actionId) {
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

  private async rememberConversation(tenantId: string, context: TurnContext) {
    try {
      const store = getProductStore();
      const state = await store.getState(tenantId);
      state.teams = { ...state.teams, mode: "live" };
      await store.putState(tenantId, state);
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
