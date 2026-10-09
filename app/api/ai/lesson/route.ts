import { NextResponse } from "next/server";
import { aiErrorResponse, generate } from "@/lib/server/claude";
import { lessonPrompt, lessonSchema, systemPrompt } from "@/lib/server/ai";
import { withCourse } from "@/lib/server/route";
import { createSession } from "@/lib/server/db";
import { redactExercise, type LessonSessionPayload } from "@/lib/server/grading";
import { dayKey, dueCards, HEART_MODES } from "@/lib/game";
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
    if (HEART_MODES.includes(mode) && !user.settings.unlimitedHearts && user.stats.hearts <= 0) {
      return NextResponse.json({ error: "You're out of hearts. Practice to earn more, or turn on unlimited hearts in Settings." }, { status: 403 });
    }
    // The browser reports whether it can play audio / record speech for this language.
    const audioOk = b.audio !== false && user.settings.listening;
    const speakingPaused = !!user.stats.speakingDisabledUntil && new Date(user.stats.speakingDisabledUntil) > new Date();
    const micOk = b.mic !== false && audioOk && user.settings.speaking && !speakingPaused;

    const today = dayKey(new Date(), user.settings.timezone);
    const due = dueCards(course, today)
      .sort((a, c) => a.box - c.box)
      .slice(0, mode === "words" ? 12 : 6);
    const mistakes = course.mistakes.slice(0, mode === "mistakes" ? 12 : 4).map((m) => `"${m.prompt}" → expected "${m.expected}", learner wrote "${m.given}"`);

    try {
      const result = await generate({
        userId: user.id,
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
              knownWords: course.cards.map((c) => c.word),
              mistakes,
              speaking: micOk,
              listening: audioOk,
              focus: typeof b.focus === "string" ? b.focus.slice(0, 200) : undefined,
            }),
          },
        ],
        schema: lessonSchema,
        effort: "low",
      });
      // Drop any exercise type the learner's device can't handle, in case the model used one anyway.
      const exercises = result.exercises.filter(
        (e) => (audioOk || !["listen_type", "listen_choice", "speak"].includes(e.type)) && (micOk || e.type !== "speak"),
      );
      const reviewWords = due.map((c) => c.word);
      const payload: LessonSessionPayload = { mode, unitId: unit?.id, lessonId: lesson?.id, exercises, reviewWords };
      const sessionId = createSession(user.id, "lesson", payload);
      return NextResponse.json({ sessionId, lesson: { ...result, exercises: exercises.map(redactExercise) }, reviewWords });
    } catch (e) {
      return aiErrorResponse(e);
    }
  });
}
