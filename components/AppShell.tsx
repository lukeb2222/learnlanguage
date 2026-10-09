"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { useUser } from "./UserProvider";
import { Avatar, Mascot, Modal, ProgressBar } from "./ui";
import { getLanguage } from "@/lib/languages";
import {
  ACHIEVEMENTS,
  achievementLevel,
  boostActive,
  dailyXpGoal,
  dayKey,
  LEAGUES,
  MAX_HEARTS,
  nextHeartAt,
} from "@/lib/game";
import { sfx } from "@/lib/sound";

const NAV = [
  { href: "/learn", label: "Learn", icon: "🏠" },
  { href: "/letters", label: "Characters", icon: "あ", scriptOnly: true },
  { href: "/practice", label: "Practice", icon: "🏋️" },
  { href: "/stories", label: "Stories", icon: "📚" },
  { href: "/tutor", label: "AI Tutor", icon: "💬" },
  { href: "/leaderboard", label: "Leagues", icon: "🏆" },
  { href: "/quests", label: "Quests", icon: "🎯" },
  { href: "/shop", label: "Shop", icon: "💎" },
  { href: "/profile", label: "Profile", icon: "👤" },
  { href: "/settings", label: "More", icon: "⚙️" },
];

const MOBILE_NAV = ["/learn", "/practice", "/tutor", "/leaderboard", "/quests", "/profile"];

export function AppShell({ children, rail = true }: { children: React.ReactNode; rail?: boolean }) {
  const { user, loading, course } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace("/");
    else if (!course || !course.plan) router.replace("/welcome");
  }, [user, loading, course, router]);

  if (!user || !course || !course.plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Mascot size={100} mood="think" className="animate-float" />
      </div>
    );
  }

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />
      <div className="flex min-w-0 flex-1 justify-center gap-8 px-0 pb-24 lg:px-6 lg:pb-8">
        <main className="w-full min-w-0 max-w-2xl">
          <TopBar />
          <div className="px-4 lg:px-0">{children}</div>
        </main>
        {rail && (
          <aside className="sticky top-0 hidden h-screen w-80 shrink-0 space-y-4 overflow-y-auto py-6 no-scrollbar xl:block">
            <StatsRow />
            <RightRail />
          </aside>
        )}
      </div>
      <MobileNav />
      <GlobalPopups />
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const { course } = useUser();
  const target = course ? getLanguage(course.languageId) : null;
  return (
    <nav className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r-2 border-grape-100 bg-white px-4 py-6 lg:flex">
      <Link href="/learn" className="mb-6 flex items-center gap-2 px-3">
        <Mascot size={40} />
        <span className="font-display text-3xl font-extrabold text-grape-500">lingora</span>
      </Link>
      <div className="flex flex-col gap-1">
        {NAV.filter((n) => !n.scriptOnly || target?.romanize).map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-4 rounded-2xl border-2 px-3 py-2.5 font-display text-[15px] font-bold uppercase tracking-wide transition ${
                active ? "border-grape-200 bg-grape-50 text-grape-600" : "border-transparent text-ink/70 hover:bg-grape-50"
              }`}
            >
              <span className="w-8 text-center text-2xl">{n.icon === "あ" ? target?.native.slice(0, 1) || "あ" : n.icon}</span>
              {n.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t-2 border-grape-100 bg-white py-2 lg:hidden">
      {NAV.filter((n) => MOBILE_NAV.includes(n.href)).map((n) => (
        <Link
          key={n.href}
          href={n.href}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${pathname.startsWith(n.href) ? "bg-grape-50 ring-2 ring-grape-200" : ""}`}
          aria-label={n.label}
        >
          {n.icon}
        </Link>
      ))}
    </nav>
  );
}

function TopBar() {
  return (
    <div className="sticky top-0 z-30 border-b-2 border-grape-100 bg-[#fbfaff]/95 px-4 py-3 backdrop-blur xl:hidden">
      <StatsRow />
    </div>
  );
}

function StatsRow() {
  const { user, course } = useUser();
  const [open, setOpen] = useState<null | "course" | "streak" | "hearts" | "gems">(null);
  if (!user || !course) return null;
  const s = user.stats;
  const today = dayKey(new Date(), user.settings.timezone);
  const doneToday = s.lastActiveDay === today;
  return (
    <div className="relative flex items-center justify-between gap-2">
      <button className="flex items-center gap-1 rounded-xl px-2 py-1 hover:bg-grape-50" onClick={() => setOpen(open === "course" ? null : "course")}>
        <span className="text-2xl">{getLanguage(course.languageId).flag}</span>
      </button>
      <button className="flex items-center gap-1 rounded-xl px-2 py-1 font-display text-lg font-bold hover:bg-grape-50" onClick={() => setOpen(open === "streak" ? null : "streak")}>
        <span className={doneToday ? "" : "grayscale"}>🔥</span>
        <span className={doneToday ? "text-coral-500" : "text-ink/40"}>{s.streak}</span>
      </button>
      <button className="flex items-center gap-1 rounded-xl px-2 py-1 font-display text-lg font-bold text-sky2-500 hover:bg-grape-50" onClick={() => setOpen(open === "gems" ? null : "gems")}>
        💎 {s.gems}
      </button>
      <button className="flex items-center gap-1 rounded-xl px-2 py-1 font-display text-lg font-bold text-coral-500 hover:bg-grape-50" onClick={() => setOpen(open === "hearts" ? null : "hearts")}>
        ❤️ {user.settings.unlimitedHearts ? "∞" : s.hearts}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-12 z-40 animate-pop">
          <div className="card p-4 shadow-xl">
            {open === "course" && <CourseSwitcher onDone={() => setOpen(null)} />}
            {open === "streak" && <StreakPanel />}
            {open === "hearts" && <HeartsPanel onDone={() => setOpen(null)} />}
            {open === "gems" && (
              <div className="text-center">
                <div className="text-4xl">💎</div>
                <p className="mt-2 font-semibold">You have {s.gems} gems.</p>
                <p className="text-sm text-ink/60">Earn gems from quests, daily goals and leagues. Spend them in the shop — everything here is free to earn.</p>
                <Link href="/shop" className="btn btn-primary mt-3 w-full" onClick={() => setOpen(null)}>
                  Go to shop
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CourseSwitcher({ onDone }: { onDone: () => void }) {
  const { user, action } = useUser();
  const router = useRouter();
  if (!user) return null;
  return (
    <div>
      <div className="mb-2 text-sm font-bold uppercase text-ink/50">My courses</div>
      <div className="flex flex-wrap gap-2">
        {Object.values(user.courses).map((c) => {
          const l = getLanguage(c.languageId);
          const active = user.activeCourse === c.languageId;
          return (
            <button
              key={c.languageId}
              className={`chip flex items-center gap-2 ${active ? "chip-on" : ""}`}
              onClick={async () => {
                await action({ type: "switchCourse", courseId: c.languageId });
                onDone();
                router.push("/learn");
              }}
            >
              <span className="text-2xl">{l.flag}</span>
              <span>{l.name}</span>
            </button>
          );
        })}
        <Link href="/welcome?add=1" className="chip flex items-center gap-2" onClick={onDone}>
          <span className="text-2xl">➕</span> Add a language
        </Link>
      </div>
    </div>
  );
}

function StreakPanel() {
  const { user } = useUser();
  if (!user) return null;
  const s = user.stats;
  const tz = user.settings.timezone;
  const today = dayKey(new Date(), tz);
  const days = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (27 - i));
    return dayKey(d, tz);
  });
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="text-5xl">🔥</span>
        <div>
          <div className="font-display text-2xl font-bold">{s.streak} day streak</div>
          <div className="text-sm text-ink/60">
            {s.lastActiveDay === today ? "You've extended your streak today! 🎉" : "Do a lesson today to extend your streak."}
          </div>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const active = s.activeDays.includes(d);
          const frozen = s.frozenDays.includes(d);
          return (
            <div
              key={d}
              title={d}
              className={`flex aspect-square items-center justify-center rounded-lg text-xs font-bold ${
                active ? "bg-coral-500 text-white" : frozen ? "bg-sky2-100 text-sky2-600" : "bg-grape-50 text-ink/30"
              } ${d === today ? "ring-2 ring-grape-400" : ""}`}
            >
              {frozen ? "🧊" : Number(d.slice(8))}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex justify-between text-sm text-ink/60">
        <span>🧊 {s.streakFreezes} freeze{s.streakFreezes === 1 ? "" : "s"} equipped</span>
        <span>Longest: {s.longestStreak}</span>
      </div>
    </div>
  );
}

function HeartsPanel({ onDone }: { onDone: () => void }) {
  const { user, action } = useUser();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!user) return null;
  const s = user.stats;
  const next = nextHeartAt(s);
  const mins = next ? Math.max(0, Math.ceil((next.getTime() - now) / 60000)) : 0;
  return (
    <div className="text-center">
      <div className="text-3xl tracking-widest">{Array.from({ length: MAX_HEARTS }, (_, i) => (i < s.hearts ? "❤️" : "🤍")).join("")}</div>
      {user.settings.unlimitedHearts ? (
        <p className="mt-2 font-semibold">Unlimited hearts are on. Mistakes won't cost you anything.</p>
      ) : s.hearts >= MAX_HEARTS ? (
        <p className="mt-2 font-semibold">Your hearts are full. You lose one for each mistake in a lesson.</p>
      ) : (
        <p className="mt-2 font-semibold">Next heart in {Math.floor(mins / 60)}h {mins % 60}m</p>
      )}
      <div className="mt-3 grid gap-2">
        <Link href="/practice" className="btn btn-mint" onClick={onDone}>
          Practice to earn hearts (free)
        </Link>
        {!user.settings.unlimitedHearts && (
          <button className="btn btn-ghost" onClick={() => action({ type: "settings", settings: { unlimitedHearts: true } })}>
            Turn on unlimited hearts
          </button>
        )}
      </div>
    </div>
  );
}

export function RightRail() {
  const { user } = useUser();
  if (!user) return null;
  const s = user.stats;
  const today = dayKey(new Date(), user.settings.timezone);
  const goal = dailyXpGoal(user.settings.dailyMinutes);
  const todayXp = s.daily[today] ?? 0;
  const league = LEAGUES[s.league.tier];
  return (
    <>
      {boostActive(s, new Date()) && (
        <div className="card flex items-center gap-3 border-sun-400 bg-sun-100 p-4">
          <span className="text-3xl">⚡</span>
          <div className="font-bold">Double XP is active!</div>
        </div>
      )}
      <Link href="/leaderboard" className="card block p-5 hover:bg-grape-50">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">{league.name} League</h3>
          <span className="text-3xl">{league.icon}</span>
        </div>
        <p className="text-sm text-ink/60">You've earned {s.league.weekXp} XP this week. Top {7} advance!</p>
      </Link>
      <div className="card p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-lg font-bold">Daily goal</h3>
          <span className="text-sm font-bold text-ink/50">
            {Math.min(todayXp, goal)}/{goal} XP
          </span>
        </div>
        <ProgressBar value={todayXp / goal} color="#ffb800" />
      </div>
      <Link href="/quests" className="card block p-5 hover:bg-grape-50">
        <h3 className="mb-3 text-lg font-bold">Daily quests</h3>
        <div className="space-y-3">
          {s.quests.items.map((q) => (
            <div key={q.id} className="flex items-center gap-3">
              <span className="text-2xl">{q.icon}</span>
              <div className="flex-1">
                <div className="text-sm font-bold">{q.label}</div>
                <ProgressBar value={q.progress / q.target} height={10} color={q.claimed ? "#9b82ff" : "#ffb800"} />
              </div>
              <span>{q.claimed ? "✅" : q.progress >= q.target ? "🎁" : "📦"}</span>
            </div>
          ))}
        </div>
      </Link>
      <div className="card flex items-center gap-3 p-4">
        <Avatar avatar={user.avatar} size={44} />
        <div className="min-w-0">
          <div className="truncate font-bold">{user.displayName}</div>
          <Link href="/profile" className="text-sm font-semibold text-grape-500">
            View profile
          </Link>
        </div>
      </div>
      <p className="px-2 text-center text-xs text-ink/40">
        Lingora is 100% free. <Link href="/research" className="underline">The research behind it</Link>
      </p>
    </>
  );
}

/** League results and newly earned achievements pop up anywhere in the app. */
function GlobalPopups() {
  const { user, action } = useUser();
  const result = user?.stats.league.lastResult;
  const showLeague = !!result && !result.seen;

  const newAchievements = useMemo(() => {
    if (!user) return [];
    return ACHIEVEMENTS.map((a) => ({ a, ...achievementLevel(a, user) })).filter(
      (x) => x.level > 0 && x.level > (user.stats.achievementsSeen[x.a.id] ?? 0),
    );
  }, [user]);
  const showAch = !showLeague && newAchievements.length > 0;

  useEffect(() => {
    if (showLeague || showAch) {
      sfx.levelUp();
      void confetti({ particleCount: 100, spread: 80, origin: { y: 0.6 } });
    }
  }, [showLeague, showAch]);

  if (showLeague && result) {
    const promoted = result.newTier > result.oldTier;
    const demoted = result.newTier < result.oldTier;
    return (
      <Modal open onClose={() => action({ type: "seenLeagueResult" })}>
        <div className="text-center">
          <div className="text-6xl">{LEAGUES[result.newTier].icon}</div>
          <h2 className="mt-2 text-2xl font-bold">
            {promoted ? `Promoted to ${LEAGUES[result.newTier].name}!` : demoted ? `Moved to ${LEAGUES[result.newTier].name}` : `You stayed in ${LEAGUES[result.newTier].name}`}
          </h2>
          <p className="mt-2 text-ink/70">
            You finished #{result.rank} of {result.cohort} last week with {result.xp} XP.
            {result.gems ? ` You won ${result.gems} gems! 💎` : ""}
          </p>
          <button className="btn btn-primary mt-5 w-full" onClick={() => action({ type: "seenLeagueResult" })}>
            Continue
          </button>
        </div>
      </Modal>
    );
  }

  if (showAch) {
    const levels = Object.fromEntries(newAchievements.map((x) => [x.a.id, x.level]));
    return (
      <Modal open onClose={() => action({ type: "seenAchievements", levels })}>
        <div className="text-center">
          <h2 className="text-2xl font-bold">Achievement unlocked!</h2>
          <div className="mt-4 space-y-3">
            {newAchievements.map(({ a, level }) => (
              <div key={a.id} className="flex items-center gap-3 rounded-2xl bg-sun-100 p-3 text-left">
                <span className="text-4xl">{a.icon}</span>
                <div>
                  <div className="font-display text-lg font-bold">
                    {a.name} · Level {level}
                  </div>
                  <div className="text-sm text-ink/70">{a.desc(a.tiers[level - 1])}</div>
                </div>
              </div>
            ))}
          </div>
          <button className="btn btn-primary mt-5 w-full" onClick={() => action({ type: "seenAchievements", levels })}>
            Awesome!
          </button>
        </div>
      </Modal>
    );
  }
  return null;
}
