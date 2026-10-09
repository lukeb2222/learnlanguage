import { NextResponse } from "next/server";
import { aiErrorResponse, generate } from "@/lib/server/claude";
import { lessonPrompt, lessonSchema, systemPrompt } from "@/lib/server/ai";
import { withCourse } from "@/lib/server/route";
import { dayKey, dueCards } from "@/lib/game";
import type { LessonMode } from "@/lib/types";

export const maxDuration = 300;

const MODES: LessonMode[] = ["lesson", "legendary", "unit_review", "test_out", "practice", "mistakes", "words", "listening", "speaking", "letters"];

export async function POST(req: Request) {
  const b = await req.json().catch(() => ({}));
  return withCourse(async ({ user, course }) => {
    const mode = (MODES.includes(b.mode) ? b.mode : "lesson") as LessonMode;
    const unit = course.plan?.units.find((u) => u.id === b.unitId);
    const lesson = unit?.lessons.find((l) => l.id === b.lessonId);
    if (["lesson", "legendary", "unit_review", "test_out"].includes(mode) && !unit) {
      return NextResponse.json({ error: "Unknown unit" }, { status: 400 });
    }
    const today = dayKey(new Date(), user.settings.timezone);
    const due = dueCards(course, today)
      .sort((a, c) => a.box - c.box)
      .slice(0, mode === "words" ? 12 : 6);
    const known = course.cards.map((c) => c.word);
    const mistakes = course.mistakes.slice(0, mode === "mistakes" ? 12 : 4).map((m) => `"${m.prompt}" → expected "${m.expected}", learner wrote "${m.given}"`);
    const speakingOff = !user.settings.speaking || (user.stats.speakingDisabledUntil && new Date(user.stats.speakingDisabledUntil) > new Date());

    try {
      const result = await generate({
        system: systemPrompt(course.profile),
        messages: [
          {
            role: "user",
            content: lessonPrompt({
              course,
              mode,
              unit,
              lesson,
              dueWords: due.map((c) => `${c.word} (${c.translation})`),
              knownWords: known,
              mistakes,
              speaking: !speakingOff,
              listening: user.settings.listening,
              focus: typeof b.focus === "string" ? b.focus.slice(0, 200) : undefined,
            }),
          },
        ],
        schema: lessonSchema,
        effort: "low",
      });
      return NextResponse.json({ lesson: result, reviewWords: due.map((c) => c.word) });
    } catch (e) {
      return aiErrorResponse(e);
    }
  });
}
