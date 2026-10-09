import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { db, save } from "@/lib/server/db";
import { weekEndsAt, weekId } from "@/lib/game";
import type { LeaderboardEntry } from "@/lib/types";

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return unauthorized();
  save();
  const scope = new URL(req.url).searchParams.get("scope") ?? "league";
  const now = new Date();
  const week = weekId(now);
  const users = Object.values(db().users);

  const pool =
    scope === "friends"
      ? users.filter((u) => u.id === me.id || me.following.includes(u.id))
      : users.filter((u) => u.stats.league.tier === me.stats.league.tier);

  const entries: LeaderboardEntry[] = pool
    .map((u) => ({
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      avatar: u.avatar,
      xp: u.stats.league.weekId === week ? u.stats.league.weekXp : 0,
      isMe: u.id === me.id,
    }))
    .filter((e) => e.isMe || e.xp > 0 || scope === "friends")
    .sort((a, b) => b.xp - a.xp || a.displayName.localeCompare(b.displayName));

  return NextResponse.json({
    entries: entries.slice(0, 50),
    tier: me.stats.league.tier,
    endsAt: weekEndsAt(now).toISOString(),
  });
}
