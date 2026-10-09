"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useUser } from "@/components/UserProvider";
import { ErrorBox, LoadingScreen, Mascot, ProgressBar } from "@/components/ui";
import { api, shuffle } from "@/lib/client";
import { getLanguage } from "@/lib/languages";
import { speak } from "@/lib/speech";
import { sfx } from "@/lib/sound";
import type { LessonResult, Story, UserState } from "@/lib/types";

const SPEAKER_COLORS = ["#7c5cff", "#ff6b47", "#1fc47f", "#2fa8ff"];
const SPEAKER_EMOJI = ["🧑", "👩", "🧔", "👧"];

function StoryPlayer() {
  const params = useSearchParams();
  const unitId = params.get("unit") ?? undefined;
  const theme = params.get("theme") ?? undefined;
  const { user, course, action, setUser } = useUser();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState("");
  const [shown, setShown] = useState(1);
  const [sessionId, setSessionId] = useState("");
  const [answers, setAnswers] = useState<Record<number, { picked: string; correctAnswer: string }>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState<null | { xp: number; result: LessonResult }>(null);
  const start = useRef(Date.now());
  const bottom = useRef<HTMLDivElement>(null);

  const lang = course ? getLanguage(course.languageId) : getLanguage("en");

  async function load() {
    setError("");
    try {
      const res = await api<{ sessionId: string; story: Story }>("/api/ai/story", { unitId, theme });
      setStory(res.story);
      setSessionId(res.sessionId);
      start.current = Date.now();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (course) void load();
  }, [course?.languageId]); // eslint-disable-line react-hooks/exhaustive-deps

  const speakers = story ? Array.from(new Set(story.segments.filter((s) => s.kind === "line").map((s) => s.speaker))) : [];

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
    const seg = story?.segments[shown - 1];
    if (seg?.kind === "line" && user?.settings.listening) speak(seg.text, lang.tts);
  }, [shown, story]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !course) return <LoadingScreen title="Loading…" />;
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!story) return <LoadingScreen title="Your AI tutor is writing a story for you…" />;

  const segs = story.segments;
  const current = segs[shown - 1];
  const blocked = current?.kind === "question" && !answers[shown - 1];
  const questions = segs.map((s, i) => ({ s, i })).filter((x) => x.s.kind === "question");

  async function finish() {
    try {
      const res = await action<{ xp: number; result: LessonResult }>({
        type: "lessonResult",
        sessionId,
        durationSec: Math.round((Date.now() - start.current) / 1000),
      });
      setDone({ xp: res.xp, result: res.result });
      sfx.complete();
      void confetti({ particleCount: 120, spread: 90 });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function pick(i: number, option: string) {
    const v = await api<{ correct: boolean; correctAnswer: string; user: UserState }>("/api/lesson/check", { sessionId, index: i, answer: option });
    setUser(v.user);
    if (v.correct) sfx.correct();
    else sfx.wrong();
    setAnswers((a) => ({ ...a, [i]: { picked: option, correctAnswer: v.correctAnswer } }));
  }

  if (done !== null) {
    const correct = done.result.correct;
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="text-7xl">{story.emoji}</div>
        <h1 className="text-3xl font-bold">Story complete!</h1>
        <p className="text-lg text-ink/70">
          You answered {correct}/{questions.length} questions correctly and earned <b className="text-sun-600">⚡ {done.xp} XP</b>.
        </p>
        <button className="btn btn-primary w-full" onClick={() => router.push("/stories")}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 pb-40">
      <div className="sticky top-0 z-10 flex items-center gap-4 bg-[#fbfaff] py-5">
        <Link href="/stories" className="text-2xl text-ink/40">
          ✕
        </Link>
        <ProgressBar value={shown / segs.length} color="#ffb800" />
      </div>
      <div className="mb-6 text-center">
        <div className="text-6xl">{story.emoji}</div>
        <h1 className="mt-2 text-3xl font-bold" dir="auto">
          {story.title}
        </h1>
        <p className="mt-1 text-ink/60">{story.setting}</p>
      </div>

      <div className="space-y-4">
        {segs.slice(0, shown).map((seg, i) => {
          if (seg.kind === "line") {
            const si = Math.max(0, speakers.indexOf(seg.speaker));
            return (
              <div key={i} className="flex animate-pop items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl" style={{ background: `${SPEAKER_COLORS[si % 4]}22` }}>
                  {SPEAKER_EMOJI[si % 4]}
                </div>
                <div className="card flex-1 p-3">
                  <div className="text-xs font-bold uppercase" style={{ color: SPEAKER_COLORS[si % 4] }}>
                    {seg.speaker}
                  </div>
                  <button className="text-left text-lg font-semibold" onClick={() => speak(seg.text, lang.tts)} dir="auto">
                    🔊 {seg.text}
                  </button>
                  {user.settings.romanization && seg.romanization && <div className="text-sm text-grape-600">{seg.romanization}</div>}
                  {revealed[i] ? (
                    <div className="mt-1 text-sm text-ink/60">{seg.translation}</div>
                  ) : (
                    <button className="mt-1 text-xs font-bold uppercase text-grape-500" onClick={() => setRevealed({ ...revealed, [i]: true })}>
                      Show translation
                    </button>
                  )}
                </div>
              </div>
            );
          }
          return <StoryQuestion key={i} seg={seg} answer={answers[i]} onPick={(o) => pick(i, o)} />;
        })}
      </div>
      <div ref={bottom} />

      <div className="fixed inset-x-0 bottom-0 border-t-2 border-grape-100 bg-white p-4" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
        <div className="mx-auto max-w-2xl">
          {shown < segs.length ? (
            <button className="btn btn-primary w-full" disabled={blocked} onClick={() => setShown(shown + 1)}>
              {blocked ? "Answer the question" : "Continue"}
            </button>
          ) : (
            <button className="btn btn-mint w-full" disabled={blocked} onClick={finish}>
              Finish story
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function StoryQuestion({
  seg,
  answer,
  onPick,
}: {
  seg: Story["segments"][number];
  answer?: { picked: string; correctAnswer: string };
  onPick: (o: string) => Promise<void>;
}) {
  const [options] = useState(() => shuffle(seg.options));
  const [busy, setBusy] = useState(false);
  const picked = answer?.picked;
  return (
    <div className="card animate-pop border-sun-400 p-4">
      <div className="mb-3 flex items-center gap-2 font-bold">
        <Mascot size={36} mood="think" /> {seg.question}
      </div>
      <div className="grid gap-2">
        {options.map((o) => {
          const isPicked = picked === o;
          const correct = o === answer?.correctAnswer;
          const cls = picked ? (correct ? "border-mint-500 bg-mint-100" : isPicked ? "border-coral-400 bg-coral-100" : "opacity-60") : "";
          return (
            <button
              key={o}
              disabled={!!picked || busy}
              className={`chip ${cls}`}
              dir="auto"
              onClick={async () => {
                setBusy(true);
                await onPick(o).catch(() => {});
                setBusy(false);
              }}
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function StoryPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <StoryPlayer />
    </Suspense>
  );
}
