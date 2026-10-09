"use client";

import Link from "next/link";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/components/UserProvider";
import { Mascot } from "@/components/ui";
import { dayKey, dueCards, MAX_HEARTS } from "@/lib/game";

export default function PracticePage() {
  return (
    <AppShell>
      <PracticeHub />
    </AppShell>
  );
}

function PracticeHub() {
  const { user, course } = useUser();
  if (!user || !course) return null;
  const today = dayKey(new Date(), user.settings.timezone);
  const due = dueCards(course, today).length;
  const items = [
    {
      href: "/lesson?mode=practice",
      icon: "🧠",
      title: "Personalized practice",
      desc: "Your AI tutor mixes weak words and recent mistakes into a quick session.",
      color: "#7c5cff",
      badge: "",
    },
    {
      href: "/lesson?mode=mistakes",
      icon: "🩹",
      title: "Mistakes review",
      desc: course.mistakes.length ? `Fix your ${course.mistakes.length} most recent mistakes.` : "No mistakes saved yet — nice!",
      color: "#ff6b47",
      badge: course.mistakes.length ? String(course.mistakes.length) : "",
      disabled: !course.mistakes.length,
    },
    {
      href: "/lesson?mode=words",
      icon: "🃏",
      title: "Words review",
      desc: due ? `${due} word${due === 1 ? "" : "s"} due for spaced repetition.` : `All ${course.cards.length} words are fresh. Come back later!`,
      color: "#1fc47f",
      badge: due ? String(due) : "",
      disabled: !course.cards.length,
    },
    { href: "/lesson?mode=listening", icon: "🎧", title: "Listening practice", desc: "Train your ear with audio-only exercises.", color: "#2fa8ff", badge: "", disabled: !user.settings.listening },
    { href: "/lesson?mode=speaking", icon: "🎤", title: "Speaking practice", desc: "Practise pronunciation with speech recognition.", color: "#ffb800", badge: "", disabled: !user.settings.speaking },
    { href: "/tutor", icon: "📞", title: "Video-call style chat", desc: "Talk out loud with your AI partner in a role-play.", color: "#e11d48", badge: "" },
  ];
  return (
    <div className="py-6">
      <div className="mb-6 flex items-center gap-4">
        <Mascot size={80} />
        <div>
          <h1 className="text-3xl font-bold">Practice Hub</h1>
          <p className="text-ink/60">
            Practice is always free and earns you hearts back ({user.stats.hearts}/{MAX_HEARTS} ❤️).
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <Link
            key={it.title}
            href={it.disabled ? "#" : it.href}
            aria-disabled={it.disabled}
            className={`card relative flex flex-col gap-2 p-5 transition hover:-translate-y-0.5 ${it.disabled ? "pointer-events-none opacity-50" : ""}`}
            style={{ boxShadow: `0 4px 0 ${it.color}33` }}
          >
            {it.badge && <span className="absolute right-4 top-4 rounded-full bg-coral-500 px-2 py-0.5 text-xs font-bold text-white">{it.badge}</span>}
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl text-3xl" style={{ background: `${it.color}22` }}>
              {it.icon}
            </span>
            <h2 className="text-xl font-bold">{it.title}</h2>
            <p className="text-sm text-ink/60">{it.desc}</p>
          </Link>
        ))}
      </div>
      <Link href="/words" className="card mt-6 flex items-center justify-between p-5 hover:bg-grape-50">
        <div>
          <h2 className="text-lg font-bold">📒 My words</h2>
          <p className="text-sm text-ink/60">{course.cards.length} words learned — see how strong each one is.</p>
        </div>
        <span className="text-2xl">→</span>
      </Link>
    </div>
  );
}
