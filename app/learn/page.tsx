"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/components/UserProvider";
import { LoadingScreen, Mascot, Modal, ProgressBar, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import { currentLesson, lessonKey, MAX_HEARTS, proficiencyScore, unitComplete } from "@/lib/game";
import { getLanguage } from "@/lib/languages";
import { prefetchLesson } from "@/lib/lessonCache";
import { deviceCaps, speak } from "@/lib/speech";
import type { Guidebook, PlanUnit, UserState } from "@/lib/types";

const UNIT_COLORS = ["#7c5cff", "#1fc47f", "#ff6b47", "#2fa8ff", "#ffb800", "#e11d48", "#14b8a6", "#9333ea"];
const OFFSETS = [0, 44, 70, 44, 0, -44, -70, -44];

type NodeKind = "lesson" | "story" | "review";

export default function LearnPage() {
  return (
    <AppShell>
      <Path />
    </AppShell>
  );
}

function Path() {
  const { user, course, setUser } = useUser();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [guideUnit, setGuideUnit] = useState<PlanUnit | null>(null);
  const [jumpUnit, setJumpUnit] = useState<PlanUnit | null>(null);
  const [noHearts, setNoHearts] = useState(false);
  const [extending, setExtending] = useState(false);
  const [extendError, setExtendError] = useState("");
  const currentRef = useRef<HTMLDivElement>(null);
  const [noAudio, setNoAudio] = useState(false);

  const cur = course ? currentLesson(course) : null;

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [course?.languageId]);

  // Prefetch the next lesson so it opens instantly.
  useEffect(() => {
    if (!course?.plan || !cur) return;
    const u = course.plan.units[cur.unitIndex];
    const l = u.lessons[cur.lessonIndex];
    let cancelled = false;
    void deviceCaps(getLanguage(course.languageId).tts).then((caps) => {
      if (cancelled) return;
      setNoAudio(!caps.audio);
      prefetchLesson(`${course.languageId}:lesson:${u.id}/${l.id}`, { mode: "lesson", unitId: u.id, lessonId: l.id, ...caps });
    });
    return () => {
      cancelled = true;
    };
  }, [course?.languageId, course?.plan, cur?.unitIndex, cur?.lessonIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !course?.plan) return null;
  const plan = course.plan;
  const lang = getLanguage(course.languageId);
  const outOfHearts = !user.settings.unlimitedHearts && user.stats.hearts <= 0;

  function start(href: string, costsHearts = true) {
    if (costsHearts && outOfHearts) {
      setNoHearts(true);
      return;
    }
    router.push(href);
  }

  async function extend() {
    setExtending(true);
    setExtendError("");
    try {
      const { user } = await api<{ user: UserState }>("/api/ai/plan", { extend: true });
      setUser(user);
    } catch (e) {
      setExtendError((e as Error).message);
    } finally {
      setExtending(false);
    }
  }

  const unitUnlocked = (ui: number) => ui === 0 || unitComplete(course, plan.units[ui - 1].id) || plan.units[ui].lessons.some((l) => course.completedLessons.includes(lessonKey(plan.units[ui].id, l.id)));

  return (
    <div className="pb-16 pt-4">
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-white p-3 text-sm font-bold text-ink/60 ring-2 ring-grape-100">
        <span>
          {lang.flag} {lang.name} · {course.profile.level} start
        </span>
        <span title="Estimated proficiency score (0-160)">📈 Score {proficiencyScore(course)}</span>
      </div>
      {noAudio && (
        <div className="mb-6 rounded-2xl bg-sun-100 p-3 text-sm font-semibold">
          🔇 This browser has no {lang.name} voice, so listening and speaking exercises are skipped. Install a {lang.name} text-to-speech voice in your
          device settings (or try another browser) to unlock them.
        </div>
      )}

      {plan.units.map((unit, ui) => {
        const color = UNIT_COLORS[ui % UNIT_COLORS.length];
        const unlocked = unitUnlocked(ui);
        const done = unitComplete(course, unit.id);
        const lessonsDone = unit.lessons.filter((l) => course.completedLessons.includes(lessonKey(unit.id, l.id))).length;
        const nodes: { kind: NodeKind; id: string; index: number }[] = [
          ...unit.lessons.map((l, li) => ({ kind: "lesson" as const, id: l.id, index: li })),
          { kind: "story", id: "story", index: unit.lessons.length },
          { kind: "review", id: "review", index: unit.lessons.length + 1 },
        ];
        return (
          <section key={unit.id} className="mb-10">
            <div className="sticky top-[60px] z-20 mb-8 rounded-3xl p-5 text-white shadow-[0_5px_0_rgba(0,0,0,0.15)] xl:top-2" style={{ background: color }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-bold uppercase opacity-80">
                    Unit {ui + 1} · {unit.cefr}
                  </div>
                  <h2 className="text-2xl font-bold leading-tight">
                    {unit.emoji} {unit.title}
                  </h2>
                  <p className="mt-1 text-sm opacity-90">{unit.description}</p>
                </div>
                <button
                  className="shrink-0 rounded-2xl border-2 border-white/40 bg-white/15 px-3 py-2 font-display text-sm font-bold uppercase hover:bg-white/25"
                  onClick={() => setGuideUnit(unit)}
                >
                  📒 Guide
                </button>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <ProgressBar value={lessonsDone / unit.lessons.length} color="#fff" height={10} className="bg-white/25" />
                <span className="text-xs font-bold">
                  {lessonsDone}/{unit.lessons.length}
                </span>
              </div>
            </div>

            {!unlocked && (
              <div className="mb-6 flex justify-center">
                <button className="btn btn-ghost text-sm" onClick={() => (outOfHearts ? setNoHearts(true) : setJumpUnit(unit))}>
                  ⏩ Jump here?
                </button>
              </div>
            )}

            <div className="relative flex flex-col items-center gap-5 pt-10">
              {nodes.map((n, ni) => {
                const offset = OFFSETS[(ni + ui * 3) % OFFSETS.length];
                const nodeId = `${unit.id}:${n.id}`;
                let state: "done" | "current" | "locked" | "open";
                let icon = "⭐";
                if (n.kind === "lesson") {
                  const isDone = course.completedLessons.includes(lessonKey(unit.id, n.id));
                  const isCurrent = cur?.unitIndex === ui && cur.lessonIndex === n.index;
                  state = isDone ? "done" : isCurrent ? "current" : "locked";
                  icon = isDone ? "✓" : n.index === 0 ? "⭐" : ["📘", "🎧", "💬", "✏️", "🧩"][n.index % 5];
                } else if (n.kind === "story") {
                  state = course.storiesDone.includes(unit.id) ? "done" : done ? "open" : "locked";
                  icon = "📖";
                } else {
                  const legendary = course.legendary.includes(unit.id);
                  state = legendary || course.completedReviews.includes(unit.id) ? "done" : done ? "open" : "locked";
                  icon = legendary ? "🌟" : "🏆";
                }
                const isSel = selected === nodeId;
                const bg =
                  state === "locked" ? "#e5e1f5" : n.kind === "review" && state === "done" ? "#ffb800" : state === "done" ? color : state === "current" || state === "open" ? color : "#e5e1f5";
                return (
                  <div key={nodeId} className="relative" style={{ transform: `translateX(${offset}px)` }} ref={state === "current" ? currentRef : undefined}>
                    {state === "current" && !isSel && (
                      <div className="absolute -top-11 left-1/2 z-10 -translate-x-1/2 animate-bounce whitespace-nowrap rounded-xl border-2 border-grape-100 bg-white px-3 py-1.5 font-display text-sm font-bold uppercase" style={{ color }}>
                        Start
                      </div>
                    )}
                    <button
                      onClick={() => setSelected(isSel ? null : nodeId)}
                      className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-3xl font-bold text-white transition active:translate-y-1 ${state === "current" ? "animate-pulseglow" : ""}`}
                      style={{
                        background: bg,
                        boxShadow: `0 7px 0 ${state === "locked" ? "#cfc8ea" : "rgba(0,0,0,0.22)"}`,
                        filter: state === "locked" ? "grayscale(1)" : undefined,
                        opacity: state === "locked" ? 0.8 : 1,
                      }}
                      aria-label={n.kind}
                    >
                      {icon}
                    </button>
                    {isSel && (
                      <NodePopover
                        color={color}
                        kind={n.kind}
                        state={state}
                        unit={unit}
                        lessonIndex={n.index}
                        legendary={course.legendary.includes(unit.id)}
                        reviewDone={course.completedReviews.includes(unit.id)}
                        onStart={(href, costs) => start(href, costs)}
                        onClose={() => setSelected(null)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {done && (
              <div className="mt-6 text-center text-sm font-bold text-mint-600">
                ✅ {unit.canDo}
              </div>
            )}
          </section>
        );
      })}

      <div className="card mt-6 flex flex-col items-center p-6 text-center">
        <Mascot size={90} mood="wow" />
        <h3 className="mt-2 text-xl font-bold">Ready for more?</h3>
        <p className="text-ink/60">Your AI tutor can design the next stage of your course based on everything you've learned.</p>
        {extendError && <p className="mt-2 text-sm font-semibold text-coral-600">{extendError}</p>}
        <button className="btn btn-primary mt-4" onClick={extend} disabled={extending || !!cur}>
          {extending ? <Spinner /> : cur ? "Finish your current units first" : "Unlock 6 more units"}
        </button>
      </div>

      <GuidebookModal unit={guideUnit} onClose={() => setGuideUnit(null)} />

      <Modal open={!!jumpUnit} onClose={() => setJumpUnit(null)}>
        {jumpUnit && (
          <div className="text-center">
            <div className="text-5xl">⏩</div>
            <h2 className="mt-2 text-2xl font-bold">Jump to Unit {plan.units.indexOf(jumpUnit) + 1}?</h2>
            <p className="mt-2 text-ink/70">Pass a quick AI test (80%+) to skip ahead. Everything before it will be marked complete.</p>
            <button className="btn btn-primary mt-5 w-full" onClick={() => start(`/lesson?mode=test_out&unit=${jumpUnit.id}`)}>
              Start test
            </button>
            <button className="btn btn-ghost mt-2 w-full" onClick={() => setJumpUnit(null)}>
              Maybe later
            </button>
          </div>
        )}
      </Modal>

      <Modal open={noHearts} onClose={() => setNoHearts(false)}>
        <div className="text-center">
          <div className="text-5xl">💔</div>
          <h2 className="mt-2 text-2xl font-bold">You're out of hearts</h2>
          <p className="mt-2 text-ink/70">Hearts refill over time (1 every 3 hours, max {MAX_HEARTS}). Or keep learning right now — for free:</p>
          <Link href="/practice" className="btn btn-mint mt-5 w-full">
            Practice to earn hearts
          </Link>
          <Link href="/settings" className="btn btn-ghost mt-2 w-full">
            Turn on unlimited hearts
          </Link>
        </div>
      </Modal>
    </div>
  );
}

function NodePopover({
  color,
  kind,
  state,
  unit,
  lessonIndex,
  legendary,
  reviewDone,
  onStart,
  onClose,
}: {
  color: string;
  kind: NodeKind;
  state: string;
  unit: PlanUnit;
  lessonIndex: number;
  legendary: boolean;
  reviewDone: boolean;
  onStart: (href: string, costsHearts: boolean) => void;
  onClose: () => void;
}) {
  const lesson = kind === "lesson" ? unit.lessons[lessonIndex] : null;
  let title = "";
  let body = "";
  let cta = "";
  let href = "";
  let costs = true;
  if (kind === "lesson" && lesson) {
    title = lesson.title;
    body = lesson.focus;
    if (state === "locked") cta = "";
    else {
      cta = state === "done" ? "Practice again +10 XP" : "Start +10 XP";
      href = `/lesson?mode=lesson&unit=${unit.id}&lesson=${lesson.id}`;
    }
  } else if (kind === "story") {
    title = `Story: ${unit.title}`;
    body = "An AI-written interactive story using what you learned in this unit.";
    cta = state === "locked" ? "" : "Read story +15 XP";
    href = `/stories/play?unit=${unit.id}`;
    costs = false;
  } else {
    title = reviewDone ? (legendary ? "Legendary!" : "Reach Legendary") : "Unit review";
    body = reviewDone
      ? legendary
        ? "You've mastered this unit at the highest level. Replay any time."
        : "Prove mastery with a harder, hint-free challenge. Free for everyone."
      : "Review everything in this unit to earn the trophy.";
    cta = state === "locked" ? "" : reviewDone ? "Legendary challenge +40 XP" : "Start review +25 XP";
    href = reviewDone ? `/lesson?mode=legendary&unit=${unit.id}` : `/lesson?mode=unit_review&unit=${unit.id}`;
  }
  return (
    <div className="absolute left-1/2 top-[86px] z-30 w-72 -translate-x-1/2 animate-pop">
      <div className="mx-auto h-0 w-0 border-x-[10px] border-b-[10px] border-x-transparent" style={{ borderBottomColor: state === "locked" ? "#e5e1f5" : color }} />
      <div className="rounded-2xl p-4 text-white shadow-lg" style={{ background: state === "locked" ? "#e5e1f5" : color, color: state === "locked" ? "#1e1b3a99" : "#fff" }}>
        <h3 className="text-lg font-bold leading-tight">{title}</h3>
        <p className="mt-1 text-sm opacity-90">{state === "locked" ? "Complete everything before this to unlock it!" : body}</p>
        {cta && (
          <button className="mt-3 w-full rounded-xl bg-white py-2.5 font-display font-bold uppercase shadow-[0_4px_0_rgba(0,0,0,0.15)] active:translate-y-1" style={{ color }} onClick={() => onStart(href, costs)}>
            {cta}
          </button>
        )}
        <button className="absolute right-3 top-2 text-sm opacity-70" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
    </div>
  );
}

function GuidebookModal({ unit, onClose }: { unit: PlanUnit | null; onClose: () => void }) {
  const { course, refresh } = useUser();
  const [guide, setGuide] = useState<Guidebook | null>(null);
  const [error, setError] = useState("");
  const lang = course ? getLanguage(course.languageId) : null;

  useEffect(() => {
    if (!unit || !course) return;
    setError("");
    const cached = course.guides[unit.id];
    if (cached) {
      setGuide(cached);
      return;
    }
    setGuide(null);
    api<{ guide: Guidebook }>("/api/ai/guidebook", { unitId: unit.id })
      .then((r) => {
        setGuide(r.guide);
        void refresh();
      })
      .catch((e) => setError((e as Error).message));
  }, [unit?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={!!unit} onClose={onClose}>
      {unit && (
        <div>
          <div className="text-sm font-bold uppercase text-grape-500">Guidebook · {unit.cefr}</div>
          <h2 className="text-2xl font-bold">
            {unit.emoji} {unit.title}
          </h2>
          <p className="mt-1 text-sm font-semibold text-mint-600">🎯 {unit.canDo}</p>
          {error && <p className="mt-4 text-coral-600">{error}</p>}
          {!guide && !error && <LoadingScreen title="Writing your guidebook…" />}
          {guide && lang && (
            <div className="mt-4 space-y-5">
              <p className="text-ink/80">{guide.overview}</p>
              <div>
                <h3 className="mb-2 text-lg font-bold">Key phrases</h3>
                <div className="space-y-2">
                  {guide.keyPhrases.map((k) => (
                    <button key={k.phrase} className="w-full rounded-2xl bg-grape-50 p-3 text-left hover:bg-grape-100" onClick={() => speak(k.phrase, lang.tts)}>
                      <div className="flex items-center gap-2 text-lg font-bold" dir="auto">
                        🔊 {k.phrase}
                      </div>
                      {k.romanization && <div className="text-sm text-grape-600">{k.romanization}</div>}
                      <div className="text-sm text-ink/70">{k.translation}</div>
                      {k.note && <div className="mt-1 text-xs text-ink/50">{k.note}</div>}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-2 text-lg font-bold">Tips</h3>
                {guide.tips.map((t) => (
                  <div key={t.title} className="mb-3 rounded-2xl border-2 border-grape-100 p-3">
                    <div className="font-bold">💡 {t.title}</div>
                    <p className="mt-1 whitespace-pre-line text-sm text-ink/80">{t.body}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          <button className="btn btn-primary mt-4 w-full" onClick={onClose}>
            Got it
          </button>
        </div>
      )}
    </Modal>
  );
}
