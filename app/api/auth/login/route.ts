import { NextResponse } from "next/server";
import { setSession, verifyPassword } from "@/lib/server/auth";
import { findUserByEmail, findUserByUsername, toClient } from "@/lib/server/db";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const login = String(body.login ?? "").trim();
  const password = String(body.password ?? "");
  const user = login.includes("@") ? findUserByEmail(login) : findUserByUsername(login);
  if (!user || !verifyPassword(password, user)) {
    return NextResponse.json({ error: "Wrong email/username or password." }, { status: 401 });
  }
  const res = NextResponse.json({ user: toClient(user) });
  setSession(res, user.id);
  return res;
}
