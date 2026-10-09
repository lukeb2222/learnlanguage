"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/components/UserProvider";
import { Mascot, ProgressBar } from "@/components/ui";
import { boostActive, MONTHLY_QUEST_TARGET } from "@/lib/game";
import { sfx } from "@/lib/sound";

export default function QuestsPage() {
  return (
    <AppShell>
      <Quests />
    </AppShell>
  );
}

function Quests() {
  const { user, action } = useUser();
  const [claimed, setClaimed] = useState<string | null>(null);
  if (!user) return null;
  const s = user.stats;
  const now = new Date();
  const midnight = new Date();
  midnight.setHours(24, 0, 0, 0);
  const hrs = Math.floor((midnight.getTime() - now.getTime()) / 3600000);
  const monthName = now.toLocaleString(undefined, { month: "long" });

  async function claim(id: string) {
    const res = await action<{ gems: number }>({ type: "claimQuest", questId: id });
    if (res.gems) {
      sfx.levelUp();
      void confetti({ particleCount: 60, spread: 60 });
      setClaimed(`+${res.gems} 💎`);
      setTimeout(() => setClaimed(null), 2000);
    }
  }

  return (
    <div className="py-6">
      <div className="card mb-6 flex items-center gap-4 bg-gradient-to-r from-grape-500 to-grape-400 p-6 text-white">
        <div className="flex-1">
          <div className="text-sm font-bold uppercase opacity-80">{monthName} challenge</div>
          <h1 className="text-2xl font-bold">Complete {MONTHLY_QUEST_TARGET} quests</h1>
          <ProgressBar value={s.monthly.questsClaimed / MONTHLY_QUEST_TARGET} color="#ffb800" className="mt-3 bg-white/25" />
          <div className="mt-1 text-sm font-bold">
            {Math.min(s.monthly.questsClaimed, MONTHLY_QUEST_TARGET)}/{MONTHLY_QUEST_TARGET} · Reward: badge + 100 💎
          </div>
        </div>
        <span className="text-6xl">🏅</span>
      </div>

      <div className="mb-3 flex items-end justify-between">
        <h2 className="text-2xl font-bold">Daily quests</h2>
        <span className="text-sm font-bold text-sun-600">⏳ {hrs} hours left</span>
      </div>
      {claimed && <div className="mb-3 animate-pop rounded-2xl bg-mint-100 p-3 text-center font-bold text-mint-600">{claimed}</div>}
      <div className="card divide-y-2 divide-grape-100">
        {s.quests.items.map((q) => {
          const done = q.progress >= q.target;
          return (
            <div key={q.id} className="flex items-center gap-4 p-5">
              <span className="text-4xl">{q.icon}</span>
              <div className="flex-1">
                <div className="font-bold">{q.label}</div>
                <div className="mt-2 flex items-center gap-2">
                  <ProgressBar value={q.progress / q.target} color={q.claimed ? "#9b82ff" : "#ffb800"} />
                  <span className="w-12 text-right text-sm font-bold text-ink/50">
                    {Math.min(q.progress, q.target)}/{q.target}
                  </span>
                </div>
              </div>
              {q.claimed ? (
                <span className="text-3xl">✅</span>
              ) : done ? (
                <button className="btn btn-sun animate-pop px-3 py-2 text-sm" onClick={() => claim(q.id)}>
                  🎁 {q.reward}
                </button>
              ) : (
                <span className="text-3xl opacity-40">📦</span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-center text-sm text-ink/60">
        Claim all three for a free 15-minute ⚡ Double XP boost!{boostActive(s, now) ? " (Active now!)" : ""}
      </p>

      {s.monthly.badges.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-3 text-2xl font-bold">Badges</h2>
          <div className="flex flex-wrap gap-3">
            {s.monthly.badges.map((b) => (
              <div key={b} className="card flex flex-col items-center p-4">
                <span className="text-4xl">🏅</span>
                <span className="text-sm font-bold">{b.replace("monthly-", "")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-8 flex justify-center">
        <Mascot size={90} />
      </div>
    </div>
  );
}
