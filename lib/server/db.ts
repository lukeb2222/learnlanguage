import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import type { Avatar, LeaderboardEntry, PublicProfile, UserState } from "../types";

export interface StoredUser extends UserState {
  passwordHash: string;
  passwordSalt: string;
}

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "lingora.sqlite");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  avatar TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  tier INTEGER NOT NULL DEFAULT 0,
  week_id TEXT NOT NULL,
  week_xp INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS users_league ON users (tier, week_id, week_xp DESC);
CREATE TABLE IF NOT EXISTS follows (
  follower TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  followee TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (follower, followee)
);
CREATE INDEX IF NOT EXISTS follows_followee ON follows (followee);
CREATE TABLE IF NOT EXISTS league_history (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_id TEXT NOT NULL,
  tier INTEGER NOT NULL,
  xp INTEGER NOT NULL,
  PRIMARY KEY (user_id, week_id)
);
CREATE INDEX IF NOT EXISTS league_history_week ON league_history (week_id, tier, xp DESC);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  payload TEXT NOT NULL,
  results TEXT NOT NULL DEFAULT '{}',
  completed INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_created ON sessions (created_at);
CREATE TABLE IF NOT EXISTS ai_usage (
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

const g = globalThis as unknown as { __lingoraDb?: Database.Database };

/**
 * SQLite database (WAL mode). Each user's game state is stored as a JSON
 * document, with the columns needed for login, leagues and friends indexed
 * alongside it. All writes to a user go through `updateUser`, which runs in an
 * IMMEDIATE transaction so concurrent requests never overwrite each other.
 */
export function db(): Database.Database {
  if (g.__lingoraDb) return g.__lingoraDb;
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const conn = new Database(DB_FILE);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  conn.pragma("busy_timeout = 5000");
  conn.exec(SCHEMA);
  g.__lingoraDb = conn;
  return conn;
}

// ---------- meta / cache ----------

export function sessionSecret(): string {
  const row = db().prepare("SELECT value FROM meta WHERE key = 'secret'").get() as { value: string } | undefined;
  if (row) return row.value;
  const secret = randomBytes(48).toString("base64url");
  db().prepare("INSERT OR IGNORE INTO meta (key, value) VALUES ('secret', ?)").run(secret);
  return (db().prepare("SELECT value FROM meta WHERE key = 'secret'").get() as { value: string }).value;
}

export function cacheGet<T>(key: string): T | null {
  const row = db().prepare("SELECT value FROM cache WHERE key = ?").get(key) as { value: string } | undefined;
  return row ? (JSON.parse(row.value) as T) : null;
}

export function cacheSet(key: string, value: unknown) {
  db().prepare("INSERT INTO cache (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(key, JSON.stringify(value));
}

// ---------- users ----------

interface UserRow {
  id: string;
  password_hash: string;
  password_salt: string;
  data: string;
}

function hydrate(row: UserRow | undefined): StoredUser | null {
  if (!row) return null;
  const following = (db().prepare("SELECT followee FROM follows WHERE follower = ?").all(row.id) as { followee: string }[]).map((r) => r.followee);
  const state = JSON.parse(row.data) as UserState;
  return { ...state, following, passwordHash: row.password_hash, passwordSalt: row.password_salt };
}

export function getUser(id: string): StoredUser | null {
  return hydrate(db().prepare("SELECT id, password_hash, password_salt, data FROM users WHERE id = ?").get(id) as UserRow | undefined);
}

export function findUserByEmail(email: string): StoredUser | null {
  return hydrate(db().prepare("SELECT id, password_hash, password_salt, data FROM users WHERE email = ?").get(email.trim().toLowerCase()) as UserRow | undefined);
}

export function findUserByUsername(username: string): StoredUser | null {
  return hydrate(db().prepare("SELECT id, password_hash, password_salt, data FROM users WHERE username = ?").get(username.trim()) as UserRow | undefined);
}

function writeUser(u: StoredUser) {
  const { passwordHash, passwordSalt, following, ...state } = u;
  void following; // stored in the follows table
  db()
    .prepare(
      `UPDATE users SET display_name = ?, avatar = ?, tier = ?, week_id = ?, week_xp = ?, data = ?, password_hash = ?, password_salt = ? WHERE id = ?`,
    )
    .run(
      u.displayName,
      JSON.stringify(u.avatar),
      u.stats.league.tier,
      u.stats.league.weekId,
      u.stats.league.weekXp,
      JSON.stringify({ ...state, following: [] }),
      passwordHash,
      passwordSalt,
      u.id,
    );
}

export function insertUser(u: StoredUser) {
  db()
    .prepare(
      `INSERT INTO users (id, email, username, display_name, avatar, password_hash, password_salt, tier, week_id, week_xp, data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', ?)`,
    )
    .run(u.id, u.email, u.username, u.displayName, JSON.stringify(u.avatar), u.passwordHash, u.passwordSalt, u.stats.league.tier, u.stats.league.weekId, 0, u.createdAt);
  writeUser(u);
}

/**
 * Loads a user, applies `fn` and saves the result atomically. `fn` must be
 * synchronous; do slow work (AI calls) before or after, never inside.
 */
export function updateUser<T>(id: string, fn: (u: StoredUser) => T): { user: StoredUser; result: T } | null {
  const tx = db().transaction(() => {
    const u = getUser(id);
    if (!u) return null;
    const result = fn(u);
    writeUser(u);
    return { user: u, result };
  });
  return tx.immediate();
}

export function toClient(u: StoredUser): UserState {
  const { passwordHash, passwordSalt, ...rest } = u;
  void passwordHash;
  void passwordSalt;
  return rest;
}

// ---------- friends ----------

export function follow(follower: string, followee: string) {
  if (follower === followee) return;
  db().prepare("INSERT OR IGNORE INTO follows (follower, followee) SELECT ?, id FROM users WHERE id = ?").run(follower, followee);
}

export function unfollow(follower: string, followee: string) {
  db().prepare("DELETE FROM follows WHERE follower = ? AND followee = ?").run(follower, followee);
}

export function publicProfile(u: StoredUser, viewerId?: string): PublicProfile {
  const followers = (db().prepare("SELECT COUNT(*) AS n FROM follows WHERE followee = ?").get(u.id) as { n: number }).n;
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    avatar: u.avatar,
    createdAt: u.createdAt,
    xp: u.stats.xp,
    streak: u.stats.streak,
    tier: u.stats.league.tier,
    highestTier: u.stats.league.highestTier,
    courses: Object.values(u.courses).map((c) => ({ languageId: c.languageId, xp: c.xp })),
    followers,
    following: u.following.length,
    isFollowing: viewerId ? !!db().prepare("SELECT 1 FROM follows WHERE follower = ? AND followee = ?").get(viewerId, u.id) : undefined,
  };
}

export function searchUsers(q: string, viewerId: string): StoredUser[] {
  const like = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  const rows = db()
    .prepare(
      `SELECT id, password_hash, password_salt, data FROM users
       WHERE id != ? AND (username LIKE ? ESCAPE '\\' OR display_name LIKE ? ESCAPE '\\') LIMIT 20`,
    )
    .all(viewerId, like, like) as UserRow[];
  return rows.map((r) => hydrate(r)!);
}

export function followedUsers(viewerId: string): StoredUser[] {
  const rows = db()
    .prepare(`SELECT u.id, u.password_hash, u.password_salt, u.data FROM follows f JOIN users u ON u.id = f.followee WHERE f.follower = ? LIMIT 100`)
    .all(viewerId) as UserRow[];
  return rows.map((r) => hydrate(r)!);
}

// ---------- leagues ----------

interface BoardRow {
  id: string;
  username: string;
  display_name: string;
  avatar: string;
  xp: number;
}

const toEntry = (r: BoardRow, me: string): LeaderboardEntry => ({
  id: r.id,
  username: r.username,
  displayName: r.display_name,
  avatar: JSON.parse(r.avatar) as Avatar,
  xp: r.xp,
  isMe: r.id === me,
});

export function leagueBoard(me: StoredUser, week: string): LeaderboardEntry[] {
  const rows = db()
    .prepare(
      `SELECT id, username, display_name, avatar, week_xp AS xp FROM users
       WHERE tier = ? AND week_id = ? AND (week_xp > 0 OR id = ?)
       ORDER BY week_xp DESC, display_name LIMIT 50`,
    )
    .all(me.stats.league.tier, week, me.id) as BoardRow[];
  if (!rows.some((r) => r.id === me.id)) {
    rows.push({ id: me.id, username: me.username, display_name: me.displayName, avatar: JSON.stringify(me.avatar), xp: me.stats.league.weekXp });
  }
  return rows.map((r) => toEntry(r, me.id));
}

export function friendsBoard(me: StoredUser, week: string): LeaderboardEntry[] {
  const rows = db()
    .prepare(
      `SELECT id, username, display_name, avatar, CASE WHEN week_id = ? THEN week_xp ELSE 0 END AS xp FROM users
       WHERE id = ? OR id IN (SELECT followee FROM follows WHERE follower = ?)
       ORDER BY xp DESC, display_name LIMIT 100`,
    )
    .all(week, me.id, me.id) as BoardRow[];
  return rows.map((r) => toEntry(r, me.id));
}

/** Everyone who competed in `tier` during `week` (finished weeks live in league_history). */
export function leagueCohort(week: string, tier: number): { id: string; xp: number }[] {
  return db()
    .prepare(
      `SELECT id, week_xp AS xp FROM users WHERE week_id = ? AND tier = ?
       UNION ALL
       SELECT user_id AS id, xp FROM league_history WHERE week_id = ? AND tier = ?`,
    )
    .all(week, tier, week, tier) as { id: string; xp: number }[];
}

export function recordLeagueHistory(userId: string, week: string, tier: number, xp: number) {
  db().prepare("INSERT OR REPLACE INTO league_history (user_id, week_id, tier, xp) VALUES (?, ?, ?, ?)").run(userId, week, tier, xp);
}

// ---------- verified lesson / story sessions ----------

export interface SessionRecord<P = unknown> {
  id: string;
  userId: string;
  kind: string;
  payload: P;
  results: Record<string, { correct: boolean; given: string }>;
  completed: boolean;
  createdAt: number;
}

export function createSession(userId: string, kind: string, payload: unknown): string {
  const id = randomUUID();
  const now = Date.now();
  db().prepare("INSERT INTO sessions (id, user_id, kind, payload, created_at) VALUES (?, ?, ?, ?, ?)").run(id, userId, kind, JSON.stringify(payload), now);
  // Housekeeping: drop sessions older than 3 days.
  db().prepare("DELETE FROM sessions WHERE created_at < ?").run(now - 3 * 86400000);
  return id;
}

export function getSession<P>(id: string, userId: string): SessionRecord<P> | null {
  const row = db().prepare("SELECT * FROM sessions WHERE id = ? AND user_id = ?").get(id, userId) as
    | { id: string; user_id: string; kind: string; payload: string; results: string; completed: number; created_at: number }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    kind: row.kind,
    payload: JSON.parse(row.payload) as P,
    results: JSON.parse(row.results),
    completed: !!row.completed,
    createdAt: row.created_at,
  };
}

/** Records the first attempt for an item; later attempts (retries) never change it. */
export function recordAttempt(sessionId: string, index: number, correct: boolean, given: string) {
  const tx = db().transaction(() => {
    const row = db().prepare("SELECT results FROM sessions WHERE id = ? AND completed = 0").get(sessionId) as { results: string } | undefined;
    if (!row) return;
    const results = JSON.parse(row.results);
    if (results[index] !== undefined) return;
    results[index] = { correct, given: given.slice(0, 300) };
    db().prepare("UPDATE sessions SET results = ? WHERE id = ?").run(JSON.stringify(results), sessionId);
  });
  tx.immediate();
}

/** Marks a session as used. Returns false if it was already completed. */
export function completeSession(sessionId: string): boolean {
  return db().prepare("UPDATE sessions SET completed = 1 WHERE id = ? AND completed = 0").run(sessionId).changes === 1;
}

// ---------- AI usage quota ----------

/** Increments today's AI call count for a user and returns the new total. */
export function countAiCall(userId: string, day: string): number {
  db().prepare("INSERT INTO ai_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT(user_id, day) DO UPDATE SET count = count + 1").run(userId, day);
  db().prepare("DELETE FROM ai_usage WHERE day < date(?, '-7 days')").run(day);
  return (db().prepare("SELECT count FROM ai_usage WHERE user_id = ? AND day = ?").get(userId, day) as { count: number }).count;
}
