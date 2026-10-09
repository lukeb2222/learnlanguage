"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/components/UserProvider";
import { cardStrength, dayKey } from "@/lib/game";
import { getLanguage } from "@/lib/languages";
import { speak } from "@/lib/speech";

export default function WordsPage() {
  return (
    <AppShell>
      <Words />
    </AppShell>
  );
}

function Words() {
  const { user, course } = useUser();
  const [q, setQ] = useState("");
  if (!user || !course) return null;
  const lang = getLanguage(course.languageId);
  const today = dayKey(new Date(), user.settings.timezone);
  const cards = [...course.cards]
    .filter((c) => !q || c.word.toLowerCase().includes(q.toLowerCase()) || c.translation.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => a.box - b.box);
  return (
    <div className="py-6">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">My words</h1>
          <p className="text-ink/60">{course.cards.length} words in your spaced-repetition deck</p>
        </div>
        <Link href="/lesson?mode=words" className="btn btn-mint px-4 py-2 text-sm">
          Review
        </Link>
      </div>
      <input className="input mb-4" placeholder="Search words…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="card divide-y-2 divide-grape-100">
        {cards.map((c) => {
          const strength = cardStrength(c);
          const bars = Math.max(1, Math.ceil(strength * 4));
          return (
            <button key={c.word} className="flex w-full items-center gap-3 p-4 text-left hover:bg-grape-50" onClick={() => speak(c.word, lang.tts)}>
              <span className="text-xl">🔊</span>
              <div className="min-w-0 flex-1">
                <div className="font-bold" dir="auto">{c.word}</div>
                {c.romanization && <div className="text-sm text-grape-600">{c.romanization}</div>}
                <div className="text-sm text-ink/60">{c.translation}</div>
              </div>
              {c.due <= today && <span className="rounded-full bg-coral-100 px-2 py-0.5 text-xs font-bold text-coral-600">Due</span>}
              <div className="flex items-end gap-0.5" title={`Strength ${Math.round(strength * 100)}%`}>
                {[1, 2, 3, 4].map((b) => (
                  <span key={b} className={`w-1.5 rounded-sm ${b <= bars ? (bars <= 1 ? "bg-coral-500" : bars <= 2 ? "bg-sun-500" : "bg-mint-500") : "bg-grape-100"}`} style={{ height: 6 + b * 4 }} />
                ))}
              </div>
            </button>
          );
        })}
        {!cards.length && <p className="p-6 text-center text-ink/60">Words you learn in lessons will appear here.</p>}
      </div>
    </div>
  );
}
