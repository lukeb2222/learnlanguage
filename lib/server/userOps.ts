import "server-only";
import { db, save, type StoredUser } from "./db";
import { DEMOTE_BOTTOM, LEAGUES, normalize, PROMOTE_TOP, weekId } from "../game";

const LEAGUE_GEMS = [50, 30, 20];

/** Finalises last week's league for this user if a new week has started. */
function rolloverLeague(user: StoredUser, now: Date) {
  const current = weekId(now);
  const league = user.stats.league;
  if (league.weekId === current) return;

  const old = { weekId: league.weekId, tier: league.tier, xp: league.weekXp };
  const cohort = Object.values(db().users)
    .map((u) => {
      const l = u.stats.league;
      if (l.weekId === old.weekId) return { id: u.id, tier: l.tier, xp: l.weekXp };
      const h = l.history[old.weekId];
      return h ? { id: u.id, tier: h.tier, xp: h.xp } : null;
    })
    .filter((x): x is { id: string; tier: number; xp: number } => !!x && x.tier === old.tier && (x.xp > 0 || x.id === user.id))
    .sort((a, b) => b.xp - a.xp);

  const rank = cohort.findIndex((c) => c.id === user.id) + 1 || cohort.length;
  let newTier = old.tier;
  if (old.xp > 0 && rank <= PROMOTE_TOP) newTier = Math.min(LEAGUES.length - 1, old.tier + 1);
  else if (old.tier > 0 && (old.xp === 0 || (cohort.length >= 15 && rank > cohort.length - DEMOTE_BOTTOM))) newTier = old.tier - 1;

  const gems = old.xp > 0 && rank <= 3 ? LEAGUE_GEMS[rank - 1] : 0;
  user.stats.gems += gems;

  league.history[old.weekId] = { tier: old.tier, xp: old.xp };
  const keys = Object.keys(league.history).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 12))) delete league.history[k];

  league.lastResult =
    old.xp > 0 || newTier !== old.tier
      ? { weekId: old.weekId, rank, cohort: cohort.length, oldTier: old.tier, newTier, xp: old.xp, gems, seen: false }
      : league.lastResult;
  league.tier = newTier;
  league.highestTier = Math.max(league.highestTier, newTier);
  league.weekId = current;
  league.weekXp = 0;
}

export function prepareUser(user: StoredUser, now = new Date()): StoredUser {
  normalize(user, now);
  rolloverLeague(user, now);
  return user;
}

export function commit() {
  save();
}
