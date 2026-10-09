import { NextResponse } from "next/server";
import type Anthropic from "@anthropic-ai/sdk";
import { aiErrorResponse, generate } from "@/lib/server/claude";
import { chatSchema, systemPrompt } from "@/lib/server/ai";
import { withCourse } from "@/lib/server/route";
import { recordChat } from "@/lib/game";
import { save, toClient } from "@/lib/server/db";
import { getLanguage } from "@/lib/languages";

export const maxDuration = 120;

const CORRECTION: Record<string, string> = {
  gentle: "Only correct errors that block understanding, and do it by naturally recasting (repeating back the correct form) inside your reply. Keep corrections[] to at most one item.",
  balanced: "List the important errors in corrections[] with a short note; ignore tiny slips.",
  strict: "List every error in corrections[] with the rule explained briefly.",
};

/** Role-play conversation partner (text chat and voice "call" mode). */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  return withCourse(async ({ user, course }) => {
    const history: { role: "user" | "assistant"; text: string }[] = Array.isArray(b.history) ? b.history.slice(-24) : [];
    const scenario = b.scenario ?? {};
    const target = getLanguage(course.profile.targetLanguage);
    const messages: Anthropic.Beta.BetaMessageParam[] = history
      .filter((t) => t.text?.trim())
      .map((t) => ({ role: t.role === "assistant" ? "assistant" : "user", content: String(t.text).slice(0, 2000) }));
    if (!messages.length || messages[0].role !== "user") {
      messages.unshift({ role: "user", content: "(The learner has opened the conversation. Greet them in character and start the scenario.)" });
    }
    if (messages[messages.length - 1].role !== "user") {
      return NextResponse.json({ error: "Say something first!" }, { status: 400 });
    }
    const system = `${systemPrompt(course.profile)}

You are now a friendly conversation partner who speaks ${target.name}.
Scenario: ${String(scenario.title ?? "Free conversation").slice(0, 200)}. Your role: ${String(scenario.role ?? "a friendly local").slice(0, 300)}. The learner's goal: ${String(scenario.goal ?? "chat naturally").slice(0, 300)}.
${b.voice ? "This is a spoken voice call: keep replies to 1-2 short sentences and natural spoken style." : "Keep replies short (1-3 sentences) so the learner does most of the talking."}
Stay in character, speak ${target.name} at the learner's level (${course.profile.level}, slightly above to stretch them), and end with a question or prompt that keeps the conversation going.
If the learner writes in their native language, help them say it in ${target.name}.
Corrections: ${CORRECTION[course.profile.correctionStyle] ?? CORRECTION.balanced} Leave corrections[] empty when there are no mistakes.`;

    try {
      const result = await generate({ system, messages, schema: chatSchema, effort: "low", maxTokens: 4000 });
      const userSpoke = history.some((t) => t.role === "user");
      if (userSpoke) {
        recordChat(user);
        save();
      }
      return NextResponse.json({ ...result, user: toClient(user) });
    } catch (e) {
      return aiErrorResponse(e);
    }
  });
}
