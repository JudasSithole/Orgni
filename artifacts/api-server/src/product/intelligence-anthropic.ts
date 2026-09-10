/**
 * Anthropic-backed IntelligenceProvider.
 *
 * Activated at boot when ANTHROPIC_API_KEY is set (see index.ts). Produces the
 * natural-language body of Orgni's reply, grounded in the context the engine
 * already gathered — it never invents facts and stays inside the capability the
 * engine picked.
 */
import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../lib/logger";
import type { IntelligenceContext, IntelligenceProvider } from "./engine";

const MODEL = process.env.ORGNI_MODEL || "claude-opus-5";

const SYSTEM = [
  "You are Orgni, an operational assistant that helps a company keep work moving.",
  "You will be given: the request, the kind of work it maps to, and the exact",
  "context the system already retrieved. Reply in 1–3 short sentences, in a",
  "calm, professional tone. Only state things supported by the provided context.",
  "If the context is thin, say what you can and what you'd need. Never invent",
  "names, numbers, documents, or system data. Do not use markdown headings.",
].join(" ");

export function createAnthropicProvider(): IntelligenceProvider {
  const client = new Anthropic(); // reads ANTHROPIC_API_KEY

  return {
    name: `anthropic:${MODEL}`,
    async generateReply(ctx: IntelligenceContext): Promise<string> {
      const user = [
        `Request: "${ctx.request.text}"`,
        `Kind of work: ${ctx.intent.verb}`,
        `Organisation: ${ctx.organisationName}`,
        ctx.contextLines.length
          ? `Context retrieved:\n${ctx.contextLines.map((l) => `- ${l}`).join("\n")}`
          : "Context retrieved: none — nothing is connected yet.",
      ].join("\n\n");

      try {
        const res = await client.messages.create({
          model: MODEL,
          max_tokens: 400,
          thinking: { type: "adaptive" },
          output_config: { effort: "low" },
          system: SYSTEM,
          messages: [{ role: "user", content: user }],
        });
        const text = res.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("")
          .trim();
        return text || fallback(ctx);
      } catch (err) {
        logger.error({ err }, "anthropic provider: generation failed");
        return fallback(ctx);
      }
    },
  };
}

function fallback(ctx: IntelligenceContext): string {
  return ctx.contextLines.length
    ? `Here's what I have on that:\n${ctx.contextLines.map((l) => `• ${l}`).join("\n")}`
    : "I don't have enough connected yet to answer that confidently.";
}
