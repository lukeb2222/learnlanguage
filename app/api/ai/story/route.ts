import { NextResponse } from "next/server";
import { aiErrorResponse, generate } from "@/lib/server/claude";
import { storySchema, systemPrompt } from "@/lib/server/ai";
import { withCourse } from "@/lib/server/route";

export const maxDuration = 300;

/** Short interactive stories with comprehension questions. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  return withCourse(async ({ course }) => {
    const unit = course.plan?.units.find((u) => u.id === b.unitId);
    const known = course.cards.map((c) => c.word).slice(-150);
    try {
      const story = await generate({
        system: systemPrompt(course.profile),
        messages: [
          {
            role: "user",
            content: `Write a short, funny or heartwarming interactive story (14-20 dialogue lines between 2-3 named characters) for this learner.
${unit ? `It should practise the unit "${unit.title}" (${unit.cefr}): ${unit.description}` : "Use material from their current level."}
${b.theme ? `Theme requested by the learner: ${String(b.theme).slice(0, 200)}` : "Connect it to their interests."}
Known words to reuse: ${known.join(", ") || "basic beginner words"}
Keep ~95% of the words known or very easy (comprehensible input), with a surprise or twist at the end.
Segments: "line" segments carry speaker/text/romanization/translation (question/options/answer empty). After every 3-4 lines insert a "question" segment testing comprehension or vocabulary: question in native language, 3 options, answer = one option (speaker/text/romanization/translation may be empty). Include 4-5 questions in total, the last one about the ending.`,
          },
        ],
        schema: storySchema,
        effort: "low",
      });
      return NextResponse.json({ story });
    } catch (e) {
      return aiErrorResponse(e);
    }
  });
}
