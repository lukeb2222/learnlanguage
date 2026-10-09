"use client";

import Link from "next/link";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/components/UserProvider";
import { Mascot } from "@/components/ui";
import { lessonKey } from "@/lib/game";

export default function StoriesPage() {
  return (
    <AppShell>
      <Stories />
    </AppShell>
  );
}

function Stories() {
  const { course } = useUser();
  const [theme, setTheme] = useState("");
  if (!course?.plan) return null;
  const units = course.plan.units;
  return (
    <div className="py-6">
      <div className="mb-6 flex items-center gap-4">
        <Mascot size={80} mood="wow" />
        <div>
          <h1 className="text-3xl font-bold">Stories</h1>
          <p className="text-ink/60">Short AI-written stories at your level, with comprehension questions. +15 XP each.</p>
        </div>
      </div>
      <form
        className="card mb-6 flex flex-col gap-3 p-5 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          window.location.href = `/stories/play?theme=${encodeURIComponent(theme || "surprise me")}`;
        }}
      >
        <input className="input" placeholder="Write a story about… (e.g. a lost cat in Tokyo)" value={theme} onChange={(e) => setTheme(e.target.value)} />
        <button className="btn btn-primary shrink-0">✨ Create story</button>
      </form>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {units.map((u, i) => {
          const started = u.lessons.some((l) => course.completedLessons.includes(lessonKey(u.id, l.id)));
          const done = course.storiesDone.includes(u.id);
          return (
            <Link
              key={u.id}
              href={started ? `/stories/play?unit=${u.id}` : "#"}
              className={`card flex flex-col items-center gap-2 p-5 text-center transition hover:-translate-y-0.5 ${started ? "" : "pointer-events-none opacity-40 grayscale"}`}
            >
              <span className="text-5xl">{u.emoji}</span>
              <span className="text-xs font-bold uppercase text-ink/50">Unit {i + 1}</span>
              <span className="font-bold leading-tight">{u.title}</span>
              {done && <span className="text-sm font-bold text-mint-600">✓ Read</span>}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
