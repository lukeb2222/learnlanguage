import { NextResponse } from "next/server";
import { aiErrorResponse, generate } from "@/lib/server/claude";
import { explainSchema, systemPrompt } from "@/lib/server/ai";
import { withCourse } from "@/lib/server/route";

/** "Explain my answer": a short personalised grammar/usage explanation. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  return withCourse(async ({ user, course }) => {
    try {
      const result = await generate({
        userId: user.id,
        system: systemPrompt(course.profile),
        messages: [
          {
            role: "user",
            content: `The learner wants to understand this exercise. Explain clearly and briefly (max ~120 words) in their native language, focusing on WHY the correct answer is right${b.given ? " and what was wrong with theirs" : ""}. Give 2 extra example sentences and one memorable tip. Match their correction preference and level.
Exercise: ${String(b.instruction ?? "").slice(0, 300)}
Prompt: ${String(b.prompt ?? "").slice(0, 500)}
Correct answer: ${String(b.expected ?? "").slice(0, 500)}
Learner's answer: ${String(b.given ?? "(none)").slice(0, 500)}
${b.question ? `Their follow-up question: ${String(b.question).slice(0, 500)}` : ""}`,
          },
        ],
        schema: explainSchema,
        effort: "low",
        maxTokens: 4000,
      });
      return NextResponse.json(result);
    } catch (e) {
      return aiErrorResponse(e);
    }
  });
}
