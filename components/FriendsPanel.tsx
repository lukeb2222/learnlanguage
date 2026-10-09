"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useUser } from "./UserProvider";
import { Avatar, Spinner } from "./ui";
import { api } from "@/lib/client";
import type { PublicProfile } from "@/lib/types";

export function FriendsPanel() {
  const { user, action } = useUser();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PublicProfile[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      setBusy(true);
      try {
        const res = await api<{ users: PublicProfile[] }>(`/api/users?q=${encodeURIComponent(q)}`);
        setResults(res.users);
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, user?.following.length]);

  if (!user) return null;
  return (
    <div className="card p-5">
      <h2 className="mb-3 text-xl font-bold">Friends</h2>
      <input className="input mb-3 py-2 text-base" placeholder="Search by name or username…" value={q} onChange={(e) => setQ(e.target.value)} />
      {busy && !results && <Spinner className="text-grape-500" />}
      <div className="space-y-2">
        {results?.map((u) => {
          const following = user.following.includes(u.id);
          return (
            <div key={u.id} className="flex items-center gap-3">
              <Link href={`/u/${u.username}`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar avatar={u.avatar} size={40} />
                <div className="min-w-0">
                  <div className="truncate font-bold">{u.displayName}</div>
                  <div className="truncate text-sm text-ink/50">
                    @{u.username} · 🔥 {u.streak} · ⚡ {u.xp}
                  </div>
                </div>
              </Link>
              <button
                className={`btn px-3 py-1.5 text-xs ${following ? "btn-ghost" : "btn-primary"}`}
                onClick={() => action({ type: following ? "unfollow" : "follow", userId: u.id })}
              >
                {following ? "Following" : "Follow"}
              </button>
            </div>
          );
        })}
        {results && !results.length && (
          <p className="text-sm text-ink/60">{q ? "No learners found." : "You're not following anyone yet. Search above to find friends!"}</p>
        )}
      </div>
    </div>
  );
}
