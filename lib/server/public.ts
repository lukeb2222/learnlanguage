import "server-only";
import { db, type StoredUser } from "./db";
import type { PublicProfile } from "../types";

export function publicProfile(u: StoredUser, viewer?: StoredUser): PublicProfile {
  const followers = Object.values(db().users).filter((x) => x.following.includes(u.id)).length;
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
    isFollowing: viewer ? viewer.following.includes(u.id) : undefined,
  };
}
