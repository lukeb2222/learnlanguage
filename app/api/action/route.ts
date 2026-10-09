import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { db, save, toClient } from "@/lib/server/db";
import { applyLessonResult, buyItem, claimQuest, MAX_HEARTS, OUTFITS } from "@/lib/game";
import type { LessonResult, Mistake, VocabItem } from "@/lib/types";

const str = (v: unknown, max = 300) => String(v ?? "").slice(0, max);
const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));

function sanitizeResult(b: Record<string, unknown>): LessonResult {
  const vocab = (Array.isArray(b.newVocab) ? b.newVocab : []).slice(0, 30).map(
    (v: Record<string, unknown>): VocabItem => ({ word: str(v.word, 80), translation: str(v.translation, 120), romanization: str(v.romanization, 120) }),
  );
  const reviewed = (Array.isArray(b.reviewed) ? b.reviewed : [])
    .slice(0, 60)
    .map((r: Record<string, unknown>) => ({ word: str(r.word, 80), correct: !!r.correct }));
  const mistakes = (Array.isArray(b.mistakes) ? b.mistakes : []).slice(0, 20).map(
    (m: Record<string, unknown>): Mistake => ({ prompt: str(m.prompt), expected: str(m.expected), given: str(m.given), at: new Date().toISOString() }),
  );
  const total = num(b.total, 40);
  return {
    mode: str(b.mode, 20) as LessonResult["mode"],
    unitId: b.unitId ? str(b.unitId, 40) : undefined,
    lessonId: b.lessonId ? str(b.lessonId, 40) : undefined,
    correct: Math.min(num(b.correct, 40), total),
    total,
    maxCombo: num(b.maxCombo, 40),
    durationSec: num(b.durationSec, 3600),
    newVocab: vocab,
    reviewed,
    mistakes,
    passed: !!b.passed,
  };
}

/** All game-state mutations go through here and are applied server-side. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const now = new Date();
  let extra: Record<string, unknown> = {};

  switch (b.type) {
    case "lessonResult":
      extra = applyLessonResult(user, sanitizeResult(b.result ?? {}), now);
      break;
    case "loseHeart":
      if (!user.settings.unlimitedHearts && user.stats.hearts > 0) {
        if (user.stats.hearts === MAX_HEARTS) user.stats.heartsUpdatedAt = now.toISOString();
        user.stats.hearts -= 1;
      }
      break;
    case "buy": {
      const error = buyItem(user, str(b.item, 30), now);
      if (error) return NextResponse.json({ error }, { status: 400 });
      break;
    }
    case "equipOutfit":
      if (user.ownedItems.includes(str(b.item, 30)) && OUTFITS.some((o) => o.id === b.item)) user.avatar.outfit = str(b.item, 30);
      break;
    case "claimQuest":
      extra = { gems: claimQuest(user, str(b.questId, 30)) };
      break;
    case "settings": {
      const s = b.settings ?? {};
      for (const key of ["sound", "listening", "speaking", "unlimitedHearts", "romanization"] as const) {
        if (typeof s[key] === "boolean") user.settings[key] = s[key];
      }
      if (typeof s.dailyMinutes === "number") user.settings.dailyMinutes = num(s.dailyMinutes, 60) || 10;
      if (typeof s.timezone === "string") user.settings.timezone = str(s.timezone, 60);
      break;
    }
    case "profile":
      if (b.displayName) user.displayName = str(b.displayName, 40);
      if (b.emoji) user.avatar.emoji = str(b.emoji, 8);
      if (b.color && /^#[0-9a-f]{6}$/i.test(b.color)) user.avatar.color = b.color;
      break;
    case "switchCourse":
      if (user.courses[b.courseId]) user.activeCourse = b.courseId;
      break;
    case "deleteCourse":
      if (user.courses[b.courseId] && Object.keys(user.courses).length > 1) {
        delete user.courses[b.courseId];
        if (user.activeCourse === b.courseId) user.activeCourse = Object.keys(user.courses)[0];
      }
      break;
    case "seenLeagueResult":
      if (user.stats.league.lastResult) user.stats.league.lastResult.seen = true;
      break;
    case "seenAchievements":
      user.stats.achievementsSeen = { ...user.stats.achievementsSeen, ...(b.levels ?? {}) };
      break;
    case "disableSpeaking":
      user.stats.speakingDisabledUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
      break;
    case "follow": {
      const target = db().users[str(b.userId, 60)];
      if (target && target.id !== user.id && !user.following.includes(target.id)) user.following.push(target.id);
      break;
    }
    case "unfollow":
      user.following = user.following.filter((id) => id !== b.userId);
      break;
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  save();
  return NextResponse.json({ user: toClient(user), ...extra });
}
