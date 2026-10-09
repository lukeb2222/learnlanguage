import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { followedUsers, publicProfile, searchUsers } from "@/lib/server/db";

export async function GET(req: Request) {
  const me = await currentUser();
  if (!me) return unauthorized();
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 40);
  const users = q ? searchUsers(q, me.id) : followedUsers(me.id);
  return NextResponse.json({ users: users.map((u) => publicProfile(u, me.id)) });
}
