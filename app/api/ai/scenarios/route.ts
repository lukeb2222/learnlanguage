import { NextResponse } from "next/server";
import { aiErrorResponse, generate } from "@/lib/server/claude";
import { scenarioSchema, systemPrompt } from "@/lib/server/ai";
import { withCourse } from "@/lib/server/route";

/** Role-play scenarios tailored to the learner's goals and interests. */
export async function POST() {
  return withCourse(async ({ user, course }) => {
    try {
      const result = await generate({
        userId: user.id,
        system: systemPrompt(course.profile),
        messages: [
          {
            role: "user",
            content:
              "Suggest 6 varied, realistic role-play scenarios for this learner's goals, interests and level. Titles and goals in the learner's native language; 'opening' is your first line in the target language. Roles describe who you (the AI) will play.",
          },
        ],
        schema: scenarioSchema,
        effort: "low",
        maxTokens: 4000,
      });
      return NextResponse.json(result);
    } catch (e) {
      return aiErrorResponse(e);
    }
  });
}
