/**
 * Bot Framework adapter for the Orgni Teams bot.
 *
 * Uses CloudAdapter + ConfigurationBotFrameworkAuthentication. With no
 * MICROSOFT_APP_ID / MICROSOFT_APP_PASSWORD set it still constructs (useful for
 * local runs against the Bot Framework Emulator with no auth); inbound requests
 * from real Teams will fail auth until the app registration is filled in.
 */
import {
  CloudAdapter,
  ConfigurationBotFrameworkAuthentication,
  type ConfigurationBotFrameworkAuthenticationOptions,
} from "botbuilder";
import { config } from "../lib/config";
import { logger } from "../lib/logger";

const authOptions: ConfigurationBotFrameworkAuthenticationOptions = {
  MicrosoftAppId: config.MICROSOFT_APP_ID,
  MicrosoftAppPassword: config.MICROSOFT_APP_PASSWORD,
  MicrosoftAppType: config.MICROSOFT_APP_TYPE,
  MicrosoftAppTenantId: config.MICROSOFT_APP_TENANT_ID,
};

const botFrameworkAuth = new ConfigurationBotFrameworkAuthentication(authOptions);

export const teamsAdapter = new CloudAdapter(botFrameworkAuth);

teamsAdapter.onTurnError = async (context, error) => {
  logger.error({ err: error }, "teams: unhandled turn error");
  try {
    await context.sendActivity(
      "Something went wrong on my side. Please try again in a moment.",
    );
  } catch {
    /* the turn context may already be closed */
  }
};

/** True when the bot has enough configuration to authenticate real Teams traffic. */
export function teamsConfigured(): boolean {
  return Boolean(config.MICROSOFT_APP_ID && config.MICROSOFT_APP_PASSWORD);
}
