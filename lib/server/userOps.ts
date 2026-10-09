import "server-only";
import { leagueCohort, recordLeagueHistory, type StoredUser } from "./db";
import { DEMOTE_BOTTOM, LEAGUES, normalize, PROMOTE_TOP, weekId } from "../game";

const LEAGUE_GEMS = [50, 30, 20];

/** Finalises last week's league for this user once a new week has started. */
function rolloverLeague(user: StoredUser, now: Date) {
  const current = weekId(now);
  const league = user.stats.league;
  if (league.weekId === current) return;

  const old = { weekId: league.weekId, tier: league.tier, xp: league.weekXp };
  const seen = new Set<string>();
  const cohort = leagueCohort(old.weekId, old.tier)
    .filter((c) => (c.xp > 0 || c.id === user.id) && !seen.has(c.id) && seen.add(c.id))
    .sort((a, b) => b.xp - a.xp);
  if (!cohort.some((c) => c.id === user.id)) cohort.push({ id: user.id, xp: old.xp });

  const rank = cohort.findIndex((c) => c.id === user.id) + 1;
  let newTier = old.tier;
  if (old.xp > 0 && rank <= PROMOTE_TOP) newTier = Math.min(LEAGUES.length - 1, old.tier + 1);
  else if (old.tier > 0 && (old.xp === 0 || (cohort.length >= 15 && rank > cohort.length - DEMOTE_BOTTOM))) newTier = old.tier - 1;

  const gems = old.xp > 0 && rank <= 3 ? LEAGUE_GEMS[rank - 1] : 0;
  user.stats.gems += gems;
  recordLeagueHistory(user.id, old.weekId, old.tier, old.xp);

  league.history[old.weekId] = { tier: old.tier, xp: old.xp };
  const keys = Object.keys(league.history).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - 12))) delete league.history[k];

  if (old.xp > 0 || newTier !== old.tier) {
    league.lastResult = { weekId: old.weekId, rank, cohort: cohort.length, oldTier: old.tier, newTier, xp: old.xp, gems, seen: false };
  }
  league.tier = newTier;
  league.highestTier = Math.max(league.highestTier, newTier);
  league.weekId = current;
  league.weekXp = 0;
}

/** Brings time-based state (hearts, streaks, quests, leagues) up to date. Call inside updateUser. */
export function prepareUser(user: StoredUser, now = new Date()): StoredUser {
  normalize(user, now);
  rolloverLeague(user, now);
  return user;
}
