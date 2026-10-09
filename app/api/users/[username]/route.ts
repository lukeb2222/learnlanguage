import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { findUserByUsername } from "@/lib/server/db";
import { publicProfile } from "@/lib/server/public";

export async function GET(_req: Request, ctx: { params: Promise<{ username: string }> }) {
  const me = await currentUser();
  if (!me) return unauthorized();
  const { username } = await ctx.params;
  const user = findUserByUsername(decodeURIComponent(username));
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
  return NextResponse.json({ user: publicProfile(user, me) });
}
