import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { UserState } from "../types";

export interface StoredUser extends UserState {
  passwordHash: string;
  passwordSalt: string;
}

interface Database {
  users: Record<string, StoredUser>;
  /** Shared AI-generated content (e.g. alphabet charts) keyed by a cache key. */
  cache: Record<string, unknown>;
  secret: string;
}

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

const g = globalThis as unknown as { __lingoraDb?: Database };

/**
 * A tiny JSON-file database. Everything lives in memory and is flushed
 * atomically to disk after each write — plenty for a self-hosted app. Swap this
 * module for Postgres/SQLite if you need to run several server instances.
 */
export function db(): Database {
  if (g.__lingoraDb) return g.__lingoraDb;
  let loaded: Database | null = null;
  try {
    loaded = JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as Database;
  } catch {
    loaded = null;
  }
  if (!loaded) {
    loaded = { users: {}, cache: {}, secret: crypto.randomUUID() + crypto.randomUUID() };
  }
  loaded.users ??= {};
  loaded.cache ??= {};
  loaded.secret ??= crypto.randomUUID() + crypto.randomUUID();
  g.__lingoraDb = loaded;
  save();
  return loaded;
}

export function save() {
  const data = g.__lingoraDb;
  if (!data) return;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, DB_FILE);
}

export function findUserByEmail(email: string): StoredUser | undefined {
  const e = email.trim().toLowerCase();
  return Object.values(db().users).find((u) => u.email === e);
}

export function findUserByUsername(username: string): StoredUser | undefined {
  const n = username.trim().toLowerCase();
  return Object.values(db().users).find((u) => u.username.toLowerCase() === n);
}

export function toClient(u: StoredUser): UserState {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, passwordSalt, ...rest } = u;
  return rest;
}
