"use client";

import { use, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/components/UserProvider";
import { Avatar, ErrorBox, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import { LEAGUES } from "@/lib/game";
import { getLanguage } from "@/lib/languages";
import type { PublicProfile } from "@/lib/types";

export default function PublicProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  return (
    <AppShell>
      <PublicProfileView username={username} />
    </AppShell>
  );
}

function PublicProfileView({ username }: { username: string }) {
  const { user, action } = useUser();
  const [p, setP] = useState<PublicProfile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ user: PublicProfile }>(`/api/users/${encodeURIComponent(username)}`)
      .then((r) => setP(r.user))
      .catch((e) => setError((e as Error).message));
  }, [username, user?.following.length]);

  if (error) return <ErrorBox message={error} />;
  if (!p || !user) return <div className="flex justify-center p-10 text-grape-500"><Spinner /></div>;
  const following = user.following.includes(p.id);
  const isMe = p.id === user.id;

  return (
    <div className="space-y-6 py-6">
      <div className="card flex flex-col items-center gap-3 p-6 text-center">
        <Avatar avatar={p.avatar} size={110} />
        <h1 className="text-3xl font-bold">{p.displayName}</h1>
        <div className="text-ink/50">@{p.username}</div>
        <div className="flex gap-4 text-sm font-bold text-ink/60">
          <span>{p.followers} followers</span>
          <span>{p.following} following</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {p.courses.map((c) => (
            <span key={c.languageId} className="rounded-xl bg-grape-50 px-2 py-1 text-sm font-bold">
              {getLanguage(c.languageId).flag} {getLanguage(c.languageId).name}
            </span>
          ))}
        </div>
        {!isMe && (
          <button className={`btn ${following ? "btn-ghost" : "btn-primary"}`} onClick={() => action({ type: following ? "unfollow" : "follow", userId: p.id })}>
            {following ? "Following ✓" : "+ Follow"}
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-4 text-center">
          <div className="text-3xl">🔥</div>
          <div className="font-display text-xl font-bold">{p.streak}</div>
          <div className="text-xs text-ink/50">Day streak</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl">⚡</div>
          <div className="font-display text-xl font-bold">{p.xp}</div>
          <div className="text-xs text-ink/50">Total XP</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl">{LEAGUES[p.tier].icon}</div>
          <div className="font-display text-xl font-bold">{LEAGUES[p.tier].name}</div>
          <div className="text-xs text-ink/50">League</div>
        </div>
      </div>
    </div>
  );
}
