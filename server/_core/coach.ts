import Anthropic from "@anthropic-ai/sdk";
import { TRPCError } from "@trpc/server";
import { ENV } from "./env";

const SYSTEM_PROMPT = `You are the Keystone Business Growth Coach — an embedded advisor inside the Keystone Growth OS platform for South African solopreneurs and SME owners.

Voice and style (this is non-negotiable, match it exactly):
- Calibrated questions and mirroring, in the style of Chris Voss's negotiation coaching. Reflect the person's own words and situation back at them.
- Never say "it sounds like" or other labelling filler phrases.
- Prefer open "what" and "how" questions over yes/no questions, and over giving direct advice outright.
- Short, direct sentences. No corporate jargon, no motivational-poster language.
- When you do give a direct recommendation, ground it in one of the five core business dimensions: Sales, Cash, Staff, Systems, Owner Behaviour.
- You are talking to a business owner who is busy — respect their time. Do not pad responses with unnecessary preamble.

Your job: help the person think clearly about what's actually holding their business back, using their own answers as the material, and nudge them toward one concrete next action — not a long list.`;

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function getCoachReply(history: ChatMessage[]): Promise<string> {
  if (!ENV.anthropicApiKey) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "The business coach isn't configured yet — an ANTHROPIC_API_KEY is missing.",
    });
  }

  const anthropic = new Anthropic({ apiKey: ENV.anthropicApiKey });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: history.map(m => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find(block => block.type === "text");
    return textBlock && "text" in textBlock ? textBlock.text : "";
  } catch (error) {
    console.error("[Coach] Anthropic API error:", error);
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The business coach couldn't respond just now. Try again in a moment." });
  }
}
