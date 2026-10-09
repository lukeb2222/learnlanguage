"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUser } from "@/components/UserProvider";
import { Mascot } from "@/components/ui";
import { LANGUAGES } from "@/lib/languages";

const FEATURES = [
  { icon: "🧠", title: "Personalised by AI", body: "Tell us your goals, interests and how you like to learn. Your AI tutor builds a course just for you — and keeps adapting." },
  { icon: "🔬", title: "Built on research", body: "Spaced repetition, retrieval practice, comprehensible input and corrective feedback are baked into every lesson." },
  { icon: "🔥", title: "Seriously fun", body: "Streaks, XP, leagues, daily quests, achievements, stories and a shop full of goodies keep you coming back." },
  { icon: "🗣️", title: "Real conversations", body: "Role-play with an AI partner by text or voice call, get instant corrections, and ask 'why?' about any answer." },
  { icon: "🌍", title: `${LANGUAGES.length} languages`, body: "From Spanish and German to Hebrew, Mandarin, Swahili and Hawaiian — with native scripts, romanization and audio." },
  { icon: "💸", title: "100% free", body: "No subscriptions, no ads, no paywalls. Every feature — including unlimited hearts — is free for everyone." },
];

export default function Landing() {
  const { user, loading } = useUser();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace("/learn");
  }, [user, loading, router]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-grape-50 to-[#fbfaff]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <Mascot size={44} />
          <span className="font-display text-3xl font-extrabold text-grape-500">lingora</span>
        </div>
        <Link href="/login" className="btn btn-ghost py-2 text-sm">
          I have an account
        </Link>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-10 md:grid-cols-2 md:py-20">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 -z-10 rounded-full bg-grape-200 blur-3xl" />
            <Mascot size={280} className="animate-float" />
          </div>
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl">
            The free, fun and <span className="text-grape-500">AI-powered</span> way to learn a language.
          </h1>
          <p className="mt-4 text-lg text-ink/70">
            Bite-sized lessons designed by an AI tutor that knows your goals — backed by decades of learning science.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row md:justify-start">
            <Link href="/signup" className="btn btn-primary px-10 py-4 text-lg">
              Get started
            </Link>
            <Link href="/login" className="btn btn-ghost px-10 py-4 text-lg">
              Log in
            </Link>
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-y-2 border-grape-100 bg-white py-5">
        <div className="flex animate-[scroll_60s_linear_infinite] gap-6 whitespace-nowrap px-6 no-scrollbar" style={{ width: "max-content" }}>
          {[...LANGUAGES, ...LANGUAGES].map((l, i) => (
            <span key={i} className="flex items-center gap-2 font-display text-lg font-bold text-ink/60">
              <span className="text-2xl">{l.flag}</span> {l.name}
            </span>
          ))}
        </div>
        <style>{`@keyframes scroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }`}</style>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6">
              <div className="text-4xl">{f.icon}</div>
              <h3 className="mt-3 text-xl font-bold">{f.title}</h3>
              <p className="mt-1 text-ink/70">{f.body}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center">
          <Link href="/research" className="font-bold text-grape-500 underline">
            Read the research behind Lingora →
          </Link>
        </div>
      </section>
    </div>
  );
}
