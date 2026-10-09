import { NextResponse } from "next/server";
import { aiErrorResponse, generate } from "@/lib/server/claude";
import { gradeSchema, systemPrompt } from "@/lib/server/ai";
import { withCourse } from "@/lib/server/route";

/** AI grading for free-text answers that don't exactly match the expected ones. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  return withCourse(async ({ course }) => {
    try {
      const result = await generate({
        system: systemPrompt(course.profile),
        messages: [
          {
            role: "user",
            content: `Grade this answer. Accept any answer that is a correct, natural translation with the same meaning, even if worded differently from the reference. Ignore capitalisation and punctuation. Mark "almost" for a single small typo or missing accent (still count it correct). Feedback: one short sentence in the learner's native language.
Task: ${String(b.instruction ?? "").slice(0, 300)}
Prompt: ${String(b.prompt ?? "").slice(0, 500)}
Reference answer: ${String(b.expected ?? "").slice(0, 500)}
Other accepted answers: ${(Array.isArray(b.accepted) ? b.accepted : []).join(" | ").slice(0, 800)}
Learner's answer: ${String(b.answer ?? "").slice(0, 500)}`,
          },
        ],
        schema: gradeSchema,
        effort: "low",
        maxTokens: 2000,
      });
      return NextResponse.json(result);
    } catch (e) {
      return aiErrorResponse(e);
    }
  });
}
