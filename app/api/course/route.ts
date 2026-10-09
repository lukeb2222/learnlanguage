import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { toClient, updateUser } from "@/lib/server/db";
import { LANGUAGES } from "@/lib/languages";
import type { Course, LearnerProfile } from "@/lib/types";

const LEVELS = ["pre-A1", "A1", "A2", "B1", "B2", "C1"];
const list = (v: unknown, max = 20) => (Array.isArray(v) ? v.map(String).slice(0, max) : []);

/** Creates (or replaces) a course from the sign-up questionnaire. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const ids = new Set(LANGUAGES.map((l) => l.id));
  if (!ids.has(b.targetLanguage) || !ids.has(b.nativeLanguage)) {
    return NextResponse.json({ error: "Please choose a language." }, { status: 400 });
  }
  if (b.targetLanguage === b.nativeLanguage) {
    return NextResponse.json({ error: "Pick a language different from your native language." }, { status: 400 });
  }
  const profile: LearnerProfile = {
    name: user.displayName,
    ageGroup: String(b.ageGroup ?? ""),
    nativeLanguage: b.nativeLanguage,
    otherLanguages: list(b.otherLanguages).filter((id) => ids.has(id)),
    targetLanguage: b.targetLanguage,
    level: LEVELS.includes(b.level) ? b.level : "pre-A1",
    goals: list(b.goals),
    interests: list(b.interests),
    learningStyles: list(b.learningStyles),
    challenges: list(b.challenges),
    correctionStyle: String(b.correctionStyle ?? "balanced"),
    motivation: String(b.motivation ?? "").slice(0, 500),
  };
  const course: Course = {
    languageId: profile.targetLanguage,
    profile,
    plan: null,
    completedLessons: [],
    completedReviews: [],
    legendary: [],
    storiesDone: [],
    cards: [],
    mistakes: [],
    guides: {},
    xp: 0,
    startedAt: new Date().toISOString(),
  };
  const saved = updateUser(user.id, (u) => {
    u.courses[profile.targetLanguage] = course;
    u.activeCourse = profile.targetLanguage;
    if (typeof b.dailyMinutes === "number" && b.dailyMinutes > 0 && b.dailyMinutes <= 60) {
      u.settings.dailyMinutes = Math.round(b.dailyMinutes);
    }
  });
  return NextResponse.json({ user: toClient(saved!.user) });
}
