import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { publicProfile } from "@/lib/server/public";

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return unauthorized();
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  const all = Object.values(db().users);
  const results = q
    ? all.filter((u) => u.id !== me.id && (u.username.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)))
    : all.filter((u) => me.following.includes(u.id));
  return NextResponse.json({ users: results.slice(0, 20).map((u) => publicProfile(u, me)) });
}
