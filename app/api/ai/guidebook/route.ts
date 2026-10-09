import { NextResponse } from "next/server";
import { aiErrorResponse, generate } from "@/lib/server/claude";
import { guidebookSchema, systemPrompt } from "@/lib/server/ai";
import { withCourse } from "@/lib/server/route";
import { updateUser } from "@/lib/server/db";

export const maxDuration = 300;

/** Per-unit guidebook (key phrases + tips). Cached on the course after the first request. */
export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  return withCourse(async ({ user, course }) => {
    const unit = course.plan?.units.find((u) => u.id === b.unitId);
    if (!unit) return NextResponse.json({ error: "Unknown unit" }, { status: 400 });
    if (course.guides[unit.id]) return NextResponse.json({ guide: course.guides[unit.id] });
    try {
      const guide = await generate({
        userId: user.id,
        system: systemPrompt(course.profile),
        messages: [
          {
            role: "user",
            content: `Write the guidebook for unit "${unit.title}" (${unit.cefr}). Description: ${unit.description}. Lessons: ${unit.lessons
              .map((l) => `${l.title} (${l.focus})`)
              .join("; ")}.
overview: 2-3 sentences. keyPhrases: 8-10 of the most useful phrases from the unit with a short usage note each. tips: 2-4 short grammar or pronunciation tips with simple examples, suited to the learner's preferred styles.`,
          },
        ],
        schema: guidebookSchema,
        effort: "low",
      });
      updateUser(user.id, (u) => {
        const c = u.courses[course.languageId];
        if (c) c.guides[unit.id] = guide;
      });
      return NextResponse.json({ guide });
    } catch (e) {
      return aiErrorResponse(e);
    }
  });
}
