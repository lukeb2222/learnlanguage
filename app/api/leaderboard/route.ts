import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { friendsBoard, leagueBoard } from "@/lib/server/db";
import { weekEndsAt, weekId } from "@/lib/game";

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return unauthorized();
  const scope = new URL(req.url).searchParams.get("scope") ?? "league";
  const now = new Date();
  const week = weekId(now);
  const entries = scope === "friends" ? friendsBoard(me, week) : leagueBoard(me, week);
  return NextResponse.json({ entries, tier: me.stats.league.tier, endsAt: weekEndsAt(now).toISOString() });
}
