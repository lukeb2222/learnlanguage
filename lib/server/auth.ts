import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { db, type StoredUser } from "./db";
import { prepareUser } from "./userOps";

const COOKIE = "lingora_session";

function secret() {
  return process.env.SESSION_SECRET || db().secret;
}

export function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
  return { hash: scryptSync(password, salt, 64).toString("hex"), salt };
}

export function verifyPassword(password: string, user: StoredUser) {
  const { hash } = hashPassword(password, user.passwordSalt);
  return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(user.passwordHash, "hex"));
}

function sign(value: string) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function setSession(res: NextResponse, userId: string) {
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 60;
  const payload = `${userId}.${expires}`;
  res.cookies.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expires),
  });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(COOKIE, "", { path: "/", expires: new Date(0) });
}

/** Returns the signed-in user (with time-based state brought up to date), or null. */
export async function currentUser(): Promise<StoredUser | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, expires, sig] = parts;
  const expected = sign(`${id}.${expires}`);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(expires) < Date.now()) return null;
  const user = db().users[id];
  if (!user) return null;
  return prepareUser(user);
}

export function unauthorized() {
  return NextResponse.json({ error: "Please sign in." }, { status: 401 });
}
