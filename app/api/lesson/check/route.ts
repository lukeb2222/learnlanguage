import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { getSession, recordAttempt, toClient, updateUser } from "@/lib/server/db";
import { aiErrorResponse } from "@/lib/server/claude";
import { CLIENT_GRADED, gradeExercise, type LessonSessionPayload, type StorySessionPayload, type Verdict } from "@/lib/server/grading";
import { HEART_MODES, MAX_HEARTS } from "@/lib/game";

export const maxDuration = 120;

/**
 * Grades one answer on the server and records the first attempt. Wrong answers
 * in heart-based lessons cost a heart here, so the browser can't skip it.
 */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const session = getSession<LessonSessionPayload | StorySessionPayload>(String(b.sessionId ?? ""), me.id);
  if (!session || session.completed) return NextResponse.json({ error: "This lesson session has ended." }, { status: 400 });
  const index = Number(b.index);
  const answer = String(b.answer ?? "").slice(0, 500);

  let verdict: Verdict;
  if (session.kind === "story") {
    const seg = (session.payload as StorySessionPayload).story.segments[index];
    if (!seg || seg.kind !== "question") return NextResponse.json({ error: "Unknown question" }, { status: 400 });
    verdict = { correct: answer === seg.answer, note: "", correctAnswer: seg.answer, explanation: "" };
  } else {
    const payload = session.payload as LessonSessionPayload;
    const ex = payload.exercises[index];
    if (!ex) return NextResponse.json({ error: "Unknown exercise" }, { status: 400 });
    if (CLIENT_GRADED.includes(ex.type)) {
      // Pair matching and speech recognition happen in the browser.
      verdict = { correct: !!b.selfReportCorrect, note: "", correctAnswer: ex.correctAnswer, explanation: ex.explanation };
    } else if (ex.type === "teach") {
      verdict = { correct: true, note: "", correctAnswer: ex.correctAnswer, explanation: ex.explanation };
    } else {
      const course = me.activeCourse ? me.courses[me.activeCourse] : null;
      if (!course) return NextResponse.json({ error: "Start a course first." }, { status: 400 });
      try {
        verdict = await gradeExercise(ex, answer, course.languageId, course.profile, me.id);
      } catch (e) {
        return aiErrorResponse(e);
      }
    }
  }

  recordAttempt(session.id, index, verdict.correct, answer || "(no answer)");

  let user = me;
  const mode = (session.payload as LessonSessionPayload).mode;
  if (!verdict.correct && session.kind === "lesson" && HEART_MODES.includes(mode)) {
    user =
      updateUser(me.id, (u) => {
        if (u.settings.unlimitedHearts || u.stats.hearts <= 0) return;
        if (u.stats.hearts === MAX_HEARTS) u.stats.heartsUpdatedAt = new Date().toISOString();
        u.stats.hearts -= 1;
      })?.user ?? me;
  }
  return NextResponse.json({ ...verdict, user: toClient(user) });
}
