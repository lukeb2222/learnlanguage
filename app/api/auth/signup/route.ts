import { NextResponse } from "next/server";
import { hashPassword, setSession } from "@/lib/server/auth";
import { findUserByEmail, findUserByUsername, insertUser, toClient, type StoredUser } from "@/lib/server/db";
import { defaultSettings, defaultStats } from "@/lib/game";

const COLORS = ["#7c5cff", "#ff6b47", "#1fc47f", "#2fa8ff", "#ffb800", "#e11d48"];
const EMOJIS = ["🦊", "🐼", "🐯", "🐨", "🦁", "🐸", "🐙", "🦄"];

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  const displayName = String(body.displayName ?? "").trim() || username;
  const timezone = String(body.timezone ?? "UTC");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username))
    return NextResponse.json({ error: "Usernames are 3-20 letters, numbers or underscores." }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ error: "Passwords need at least 8 characters." }, { status: 400 });
  if (findUserByEmail(email)) return NextResponse.json({ error: "That email already has an account." }, { status: 409 });
  if (findUserByUsername(username)) return NextResponse.json({ error: "That username is taken." }, { status: 409 });

  const now = new Date();
  const { hash, salt } = hashPassword(password);
  const id = crypto.randomUUID();
  const user: StoredUser = {
    id,
    email,
    username,
    displayName: displayName.slice(0, 40),
    avatar: {
      emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      outfit: "none",
    },
    createdAt: now.toISOString(),
    settings: defaultSettings(timezone),
    stats: defaultStats(now),
    courses: {},
    activeCourse: null,
    following: [],
    ownedItems: ["none"],
    passwordHash: hash,
    passwordSalt: salt,
  };
  try {
    insertUser(user);
  } catch {
    return NextResponse.json({ error: "That email or username is already taken." }, { status: 409 });
  }
  const res = NextResponse.json({ user: toClient(user) });
  setSession(res, id);
  return res;
}
