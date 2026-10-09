import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { NextResponse } from "next/server";
import type { z } from "zod";
import { countAiCall } from "./db";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

/** Models that accept the server-side `fallbacks: "default"` refusal fallback. */
const FALLBACK_MODELS = new Set(["claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"]);

const g = globalThis as unknown as { __anthropic?: Anthropic };
function client() {
  g.__anthropic ??= new Anthropic();
  return g.__anthropic;
}

export class AIError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}

type Effort = "low" | "medium" | "high";

/** Max AI requests per learner per day (0 = unlimited). Protects the host's API bill. */
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT ?? 200);

interface GenerateOptions<S extends z.ZodType> {
  /** The learner this request is for; counted against the daily AI quota. */
  userId: string;
  /** Stable instructions (pedagogy + learner profile). Cached across requests. */
  system: string;
  /** The specific request, or a full conversation. */
  messages: Anthropic.Beta.BetaMessageParam[];
  schema: S;
  effort?: Effort;
  maxTokens?: number;
}

/**
 * One structured call to Claude. The response is validated against `schema`
 * (Zod) via structured outputs, so callers always receive well-formed data.
 */
export async function generate<S extends z.ZodType>({
  userId,
  system,
  messages,
  schema,
  effort = "medium",
  maxTokens = 16000,
}: GenerateOptions<S>): Promise<z.infer<S>> {
  if (DAILY_LIMIT > 0 && countAiCall(userId, new Date().toISOString().slice(0, 10)) > DAILY_LIMIT) {
    throw new AIError("You've reached today's limit for AI-generated content. It resets at midnight (UTC) — see you tomorrow!", 429);
  }
  const useFallback = FALLBACK_MODELS.has(MODEL);
  let response;
  try {
    response = await client().beta.messages.parse({
      model: MODEL,
      max_tokens: maxTokens,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages,
      output_config: { effort, format: betaZodOutputFormat(schema) },
      ...(useFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new AIError("The server's ANTHROPIC_API_KEY is missing or invalid.", 500);
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new AIError("The AI tutor is busy right now — please try again in a moment.", 429);
    }
    if (error instanceof Anthropic.APIError) {
      throw new AIError(`AI request failed (${error.status ?? "network"}): ${error.message}`, 502);
    }
    if (error instanceof Error && /api key|apiKey|authentication/i.test(error.message)) {
      throw new AIError("The server has no ANTHROPIC_API_KEY configured.", 500);
    }
    throw error;
  }

  if (response.stop_reason === "refusal") {
    throw new AIError("The AI couldn't help with that request. Try rephrasing it.", 422);
  }
  if (response.stop_reason === "max_tokens") {
    throw new AIError("The AI response was cut off. Please try again.", 502);
  }
  if (response.parsed_output == null) {
    throw new AIError("The AI returned an unexpected response. Please try again.", 502);
  }
  return response.parsed_output as z.infer<S>;
}

export function aiErrorResponse(error: unknown) {
  if (error instanceof AIError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Something went wrong talking to the AI." }, { status: 500 });
}
