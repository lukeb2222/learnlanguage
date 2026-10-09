import "server-only";
import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { sessionSecret, updateUser, type StoredUser } from "./db";
import { prepareUser } from "./userOps";

const COOKIE = "lingora_session";

function secret() {
  return process.env.SESSION_SECRET || sessionSecret();
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
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    expires: new Date(expires),
  });
}

export function clearSession(res: NextResponse) {
  res.cookies.set(COOKIE, "", { path: "/", expires: new Date(0) });
}

/** The signed-in user's id from the session cookie, or null. */
export async function currentUserId(): Promise<string | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [id, expires, sig] = parts;
  const expected = sign(`${id}.${expires}`);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  if (Number(expires) < Date.now()) return null;
  return id;
}

/** Returns the signed-in user with time-based state brought up to date (and saved), or null. */
export async function currentUser(): Promise<StoredUser | null> {
  const id = await currentUserId();
  if (!id) return null;
  return updateUser(id, (u) => prepareUser(u))?.user ?? null;
}

export function unauthorized() {
  return NextResponse.json({ error: "Please sign in." }, { status: 401 });
}
