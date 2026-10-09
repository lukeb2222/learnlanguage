"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/components/UserProvider";
import { Avatar, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import { DEMOTE_BOTTOM, LEAGUES, PROMOTE_TOP } from "@/lib/game";
import type { LeaderboardEntry } from "@/lib/types";

export default function LeaderboardPage() {
  return (
    <AppShell>
      <Leaderboard />
    </AppShell>
  );
}

function Leaderboard() {
  const { user } = useUser();
  const [scope, setScope] = useState<"league" | "friends">("league");
  const [data, setData] = useState<{ entries: LeaderboardEntry[]; tier: number; endsAt: string } | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setData(null);
    api<{ entries: LeaderboardEntry[]; tier: number; endsAt: string }>(`/api/leaderboard?scope=${scope}`).then(setData).catch(() => {});
  }, [scope, user?.stats.league.weekXp]);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, []);

  if (!user) return null;
  const tier = user.stats.league.tier;
  const ms = data ? new Date(data.endsAt).getTime() - now : 0;
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const n = data?.entries.length ?? 0;

  return (
    <div className="py-6">
      <div className="mb-4 flex justify-center gap-2 overflow-x-auto py-2 no-scrollbar">
        {LEAGUES.map((l, i) => (
          <div
            key={l.name}
            title={l.name}
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${i === tier ? "scale-110 ring-4" : i > tier ? "opacity-30 grayscale" : ""}`}
            style={{ background: `${l.color}22`, ["--tw-ring-color" as string]: l.color }}
          >
            {l.icon}
          </div>
        ))}
      </div>
      <h1 className="text-center text-3xl font-bold">{LEAGUES[tier].name} League</h1>
      <p className="text-center text-ink/60">
        Top {PROMOTE_TOP} advance to the next league · {days}d {hours}h left
      </p>

      <div className="mx-auto mt-5 flex max-w-xs rounded-2xl bg-grape-50 p-1">
        {(["league", "friends"] as const).map((s) => (
          <button key={s} className={`flex-1 rounded-xl py-2 font-display font-bold uppercase ${scope === s ? "bg-white text-grape-600 shadow" : "text-ink/50"}`} onClick={() => setScope(s)}>
            {s === "league" ? "League" : "Friends"}
          </button>
        ))}
      </div>

      <div className="card mt-5 overflow-hidden">
        {!data && (
          <div className="flex justify-center p-10 text-grape-500">
            <Spinner />
          </div>
        )}
        {data?.entries.map((e, i) => {
          const rank = i + 1;
          const promo = scope === "league" && rank <= PROMOTE_TOP && e.xp > 0 && tier < LEAGUES.length - 1;
          const demo = scope === "league" && n >= 15 && rank > n - DEMOTE_BOTTOM && tier > 0;
          return (
            <div key={e.id}>
              {scope === "league" && rank === PROMOTE_TOP + 1 && tier < LEAGUES.length - 1 && (
                <div className="bg-mint-100 py-1 text-center text-xs font-bold uppercase text-mint-600">▲ Promotion zone</div>
              )}
              <Link href={e.isMe ? "/profile" : `/u/${e.username}`} className={`flex items-center gap-3 px-4 py-3 ${e.isMe ? "bg-grape-50" : "hover:bg-grape-50/50"}`}>
                <span className={`w-8 text-center font-display text-lg font-bold ${promo ? "text-mint-600" : demo ? "text-coral-500" : "text-ink/50"}`}>
                  {rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : rank}
                </span>
                <Avatar avatar={e.avatar} size={44} />
                <span className="min-w-0 flex-1 truncate font-bold">{e.displayName}{e.isMe && " (you)"}</span>
                <span className="font-bold text-ink/60">{e.xp} XP</span>
              </Link>
            </div>
          );
        })}
        {data && data.entries.length <= 1 && (
          <p className="p-5 text-center text-sm text-ink/60">
            {scope === "friends" ? (
              <>Follow friends from your <Link href="/profile" className="font-bold text-grape-500">profile</Link> to compete with them!</>
            ) : (
              <>Earn XP this week to show up in your league. Invite friends — the more learners, the fiercer the competition!</>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
