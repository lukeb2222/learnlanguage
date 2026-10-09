"use client";

import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FriendsPanel } from "@/components/FriendsPanel";
import { useUser } from "@/components/UserProvider";
import { Avatar, Modal, ProgressBar } from "@/components/ui";
import { ACHIEVEMENTS, achievementLevel, dayKey, LEAGUES, proficiencyScore } from "@/lib/game";
import { getLanguage } from "@/lib/languages";

const EMOJIS = ["🦊", "🐼", "🐯", "🐨", "🦁", "🐸", "🐙", "🦄", "🐧", "🐵", "🐶", "🐱", "🦉", "🐢", "🐳", "🦋", "😀", "😎", "🤓", "👽"];
const COLORS = ["#7c5cff", "#ff6b47", "#1fc47f", "#2fa8ff", "#ffb800", "#e11d48", "#14b8a6", "#1e1b3a"];

export default function ProfilePage() {
  return (
    <AppShell>
      <Profile />
    </AppShell>
  );
}

function Profile() {
  const { user, action } = useUser();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  if (!user) return null;
  const s = user.stats;
  const words = Object.values(user.courses).reduce((a, c) => a + c.cards.length, 0);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { key: dayKey(d, user.settings.timezone), label: d.toLocaleDateString(undefined, { weekday: "short" }) };
  });
  const maxXp = Math.max(10, ...days.map((d) => s.daily[d.key] ?? 0));

  return (
    <div className="space-y-6 py-6">
      <div className="card flex flex-col items-center gap-4 p-6 sm:flex-row">
        <button onClick={() => { setName(user.displayName); setEditing(true); }} aria-label="Edit avatar">
          <Avatar avatar={user.avatar} size={110} />
        </button>
        <div className="text-center sm:text-left">
          <h1 className="text-3xl font-bold">{user.displayName}</h1>
          <div className="text-ink/50">@{user.username}</div>
          <div className="text-sm text-ink/50">Joined {new Date(user.createdAt).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</div>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            {Object.values(user.courses).map((c) => (
              <span key={c.languageId} className="rounded-xl bg-grape-50 px-2 py-1 text-sm font-bold" title={getLanguage(c.languageId).name}>
                {getLanguage(c.languageId).flag} {c.xp} XP · score {proficiencyScore(c)}
              </span>
            ))}
          </div>
        </div>
        <button className="btn btn-ghost ml-auto px-4 py-2 text-sm" onClick={() => { setName(user.displayName); setEditing(true); }}>
          ✏️ Edit
        </button>
      </div>

      <div>
        <h2 className="mb-3 text-xl font-bold">Statistics</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
            { icon: "🔥", value: s.streak, label: "Day streak" },
            { icon: "⚡", value: s.xp, label: "Total XP" },
            { icon: LEAGUES[s.league.tier].icon, value: LEAGUES[s.league.tier].name, label: "Current league" },
            { icon: "🃏", value: words, label: "Words learned" },
            { icon: "🏆", value: s.longestStreak, label: "Longest streak" },
            { icon: "🎯", value: s.perfectLessons, label: "Perfect lessons" },
          ].map((x) => (
            <div key={x.label} className="card flex items-center gap-3 p-4">
              <span className="text-3xl">{x.icon}</span>
              <div>
                <div className="font-display text-xl font-bold">{x.value}</div>
                <div className="text-sm text-ink/50">{x.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-4 text-xl font-bold">XP this week</h2>
        <div className="flex h-40 items-end justify-between gap-2">
          {days.map((d) => {
            const v = s.daily[d.key] ?? 0;
            return (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-bold text-ink/50">{v || ""}</span>
                <div className="w-full rounded-t-lg bg-grape-400" style={{ height: `${(v / maxXp) * 110 + 4}px`, opacity: v ? 1 : 0.2 }} />
                <span className="text-xs font-bold text-ink/50">{d.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-xl font-bold">Achievements</h2>
        <div className="card divide-y-2 divide-grape-100">
          {ACHIEVEMENTS.map((a) => {
            const { level, value, next, max } = achievementLevel(a, user);
            return (
              <div key={a.id} className="flex items-center gap-4 p-4">
                <div className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-3xl ${level ? "bg-sun-100" : "bg-grape-50 grayscale"}`}>
                  {a.icon}
                  <span className="absolute -bottom-1 rounded-full bg-white px-1.5 text-[10px] font-bold ring-2 ring-grape-100">LV {level}</span>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <span className="font-bold">{a.name}</span>
                    <span className="text-sm font-bold text-ink/40">{next !== undefined ? `${value}/${next}` : "MAX"}</span>
                  </div>
                  <ProgressBar value={next !== undefined ? value / next : 1} color="#ffb800" height={12} className="my-1" />
                  <div className="text-sm text-ink/60">{level < max ? a.desc(next!) : "Fully completed!"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <FriendsPanel />

      <Modal open={editing} onClose={() => setEditing(false)}>
        <h2 className="mb-4 text-xl font-bold">Edit profile</h2>
        <div className="mb-4 flex justify-center">
          <Avatar avatar={user.avatar} size={90} />
        </div>
        <input className="input mb-4" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        <div className="mb-3 grid grid-cols-10 gap-1">
          {EMOJIS.map((e) => (
            <button key={e} className={`rounded-lg p-1 text-2xl ${user.avatar.emoji === e ? "bg-grape-100" : ""}`} onClick={() => action({ type: "profile", emoji: e })}>
              {e}
            </button>
          ))}
        </div>
        <div className="mb-4 flex justify-center gap-2">
          {COLORS.map((c) => (
            <button
              key={c}
              className={`h-8 w-8 rounded-full ${user.avatar.color === c ? "ring-4 ring-grape-200" : ""}`}
              style={{ background: c }}
              onClick={() => action({ type: "profile", color: c })}
              aria-label={c}
            />
          ))}
        </div>
        <button
          className="btn btn-primary w-full"
          onClick={async () => {
            if (name.trim()) await action({ type: "profile", displayName: name.trim() });
            setEditing(false);
          }}
        >
          Save
        </button>
      </Modal>
    </div>
  );
}
