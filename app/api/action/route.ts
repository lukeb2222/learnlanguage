import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { completeSession, follow, getSession, toClient, unfollow, updateUser } from "@/lib/server/db";
import { lessonResultFromSession, storyResultFromSession, type LessonSessionPayload, type StorySessionPayload } from "@/lib/server/grading";
import { applyLessonResult, buyItem, claimQuest, OUTFITS } from "@/lib/game";
import type { LessonResult } from "@/lib/types";

const str = (v: unknown, max = 300) => String(v ?? "").slice(0, max);
const num = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));

class ActionError extends Error {}

/** All game-state mutations go through here and are applied server-side, atomically. */
export async function POST(req: Request) {
  const me = await currentUser();
  if (!me) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const now = new Date();

  // Lessons and stories: the result is computed from the server's own grading records.
  let verified: LessonResult | null = null;
  if (b.type === "lessonResult") {
    const sessionId = str(b.sessionId, 60);
    const session = getSession<LessonSessionPayload | StorySessionPayload>(sessionId, me.id);
    if (!session) return NextResponse.json({ error: "Unknown lesson session." }, { status: 400 });
    if (!completeSession(sessionId)) return NextResponse.json({ error: "This lesson was already submitted." }, { status: 409 });
    verified =
      session.kind === "story"
        ? storyResultFromSession(session as typeof session & { payload: StorySessionPayload }, { durationSec: b.durationSec }, now.getTime())
        : lessonResultFromSession(session as typeof session & { payload: LessonSessionPayload }, { maxCombo: b.maxCombo, durationSec: b.durationSec }, now.getTime());
  }

  if (b.type === "follow" || b.type === "unfollow") {
    (b.type === "follow" ? follow : unfollow)(me.id, str(b.userId, 60));
  }

  try {
    const saved = updateUser(me.id, (user) => {
      let extra: Record<string, unknown> = {};
      switch (b.type) {
        case "lessonResult":
          extra = { ...applyLessonResult(user, verified!, now), result: verified };
          break;
        case "buy": {
          const error = buyItem(user, str(b.item, 30), now);
          if (error) throw new ActionError(error);
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
        case "follow":
        case "unfollow":
          break;
        default:
          throw new ActionError("Unknown action");
      }
      return extra;
    });
    if (!saved) return unauthorized();
    return NextResponse.json({ user: toClient(saved.user), ...saved.result });
  } catch (e) {
    if (e instanceof ActionError) return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
