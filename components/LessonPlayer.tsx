"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { useUser } from "./UserProvider";
import { ErrorBox, LoadingScreen, Mascot, Modal, ProgressBar, Spinner } from "./ui";
import { api, shuffle, similarity } from "@/lib/client";
import { getLesson } from "@/lib/lessonCache";
import { canRecognize, deviceCaps, listen, speak } from "@/lib/speech";
import { sfx } from "@/lib/sound";
import { getLanguage } from "@/lib/languages";
import { dailyXpGoal, dayKey, HEART_MODES, MAX_HEARTS } from "@/lib/game";
import { NO_SPACE_LANGS } from "@/lib/answers";
import type { Exercise, Lesson, LessonMode, LessonResult, UserState } from "@/lib/types";

const LIVES_MODES: LessonMode[] = ["legendary", "test_out"];

interface QueueItem {
  ex: Exercise;
  retry: boolean;
  key: number;
}

type Status = "answering" | "checking" | "correct" | "wrong";

interface Verdict {
  correct: boolean;
  note: string;
  correctAnswer: string;
  explanation: string;
  user: UserState;
}

export function LessonPlayer({ mode, unitId, lessonId, focus }: { mode: LessonMode; unitId?: string; lessonId?: string; focus?: string }) {
  const { user, course, action, setUser } = useUser();
  const router = useRouter();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [error, setError] = useState("");
  const [started, setStarted] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<Status>("answering");
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ title: string; detail: string; correctAnswer?: string }>({ title: "", detail: "" });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [livesLost, setLivesLost] = useState(0);
  const [outOfHearts, setOutOfHearts] = useState(false);
  const [quitOpen, setQuitOpen] = useState(false);
  const [explainOpen, setExplainOpen] = useState(false);
  const [finished, setFinished] = useState<null | { xp: number; result: LessonResult; events: string[] }>(null);
  const [showRoman, setShowRoman] = useState(true);
  const [noAudio, setNoAudio] = useState(false);
  const [lastExpected, setLastExpected] = useState("");
  const [checkError, setCheckError] = useState("");
  const startTime = useRef(Date.now());

  const lang = course ? getLanguage(course.languageId) : getLanguage("en");
  const native = course ? getLanguage(course.profile.nativeLanguage) : getLanguage("en");

  const load = useCallback(async () => {
    if (!course) return;
    setError("");
    try {
      const caps = await deviceCaps(lang.tts);
      setNoAudio(!caps.audio);
      const key = `${course.languageId}:${mode}:${unitId ?? ""}/${lessonId ?? ""}`;
      const res = await getLesson(key, { mode, unitId, lessonId, focus, ...caps }, { consume: true });
      setLesson(res.lesson);
      setSessionId(res.sessionId);
      setQueue(res.lesson.exercises.map((ex, i) => ({ ex, retry: false, key: i })));
    } catch (e) {
      setError((e as Error).message);
    }
  }, [course?.languageId, mode, unitId, lessonId, focus]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (course && !lesson) void load();
  }, [course?.languageId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (user) setShowRoman(user.settings.romanization);
  }, [user?.settings.romanization]); // eslint-disable-line react-hooks/exhaustive-deps

  const item = queue[index];
  const ex = item?.ex;
  const hearts = user?.stats.hearts ?? MAX_HEARTS;
  const unlimited = user?.settings.unlimitedHearts ?? false;
  const maxLives = 3;

  // auto-play audio for listening/teach exercises
  useEffect(() => {
    if (!ex || !started || !user?.settings.listening) return;
    if (["listen_type", "listen_choice", "teach"].includes(ex.type)) {
      const t = setTimeout(() => speak(ex.audioText || ex.prompt, lang.tts), 350);
      return () => clearTimeout(t);
    }
  }, [index, started]); // eslint-disable-line react-hooks/exhaustive-deps

  /** The server recomputes the result from its own grading records. */
  const finish = useCallback(async () => {
    try {
      const res = await action<{ xp: number; events: string[]; result: LessonResult }>({
        type: "lessonResult",
        sessionId,
        maxCombo,
        durationSec: Math.round((Date.now() - startTime.current) / 1000),
      });
      setFinished({ xp: res.xp, result: res.result, events: res.events });
      if (res.result.passed) {
        sfx.complete();
        void confetti({ particleCount: 140, spread: 90, origin: { y: 0.5 } });
      }
    } catch (e) {
      setError((e as Error).message);
    }
  }, [sessionId, maxCombo, action]);

  if (!user || !course) return <LoadingScreen title="Loading…" />;
  if (error) return <ErrorBox message={error} onRetry={finished === null && !lesson ? load : () => router.push("/learn")} />;
  if (!lesson) return <LoadingScreen />;

  if (finished) return <LessonComplete finished={finished} user={user} onContinue={() => router.push(mode === "lesson" || LIVES_MODES.includes(mode) || mode === "unit_review" ? "/learn" : "/practice")} />;

  if (!started) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 p-6 text-center">
        <Mascot size={130} mood="happy" className="animate-float" outfit={user.avatar.outfit} />
        <div className="text-sm font-bold uppercase text-grape-500">
          {lang.flag} {mode === "lesson" ? "Lesson" : mode.replace("_", " ")}
        </div>
        <h1 className="text-3xl font-bold">{lesson.title}</h1>
        <p className="text-lg text-ink/70">{lesson.intro}</p>
        {lesson.culturalNote && (
          <div className="card p-4 text-left">
            <div className="mb-1 text-xs font-bold uppercase text-coral-500">🌍 Culture note</div>
            <p className="text-ink/80">{lesson.culturalNote}</p>
          </div>
        )}
        {noAudio && (
          <p className="rounded-2xl bg-sun-100 p-3 text-sm font-semibold">
            🔇 Your browser has no {lang.name} voice installed, so listening and speaking exercises are skipped. Add a {lang.name} voice in your device&apos;s
            text-to-speech settings to unlock them.
          </p>
        )}
        {LIVES_MODES.includes(mode) && <p className="font-semibold text-coral-600">You can make up to {maxLives - 1} mistakes. No hints!</p>}
        <button
          className="btn btn-primary w-full py-4 text-lg"
          onClick={() => {
            startTime.current = Date.now();
            setStarted(true);
          }}
        >
          Let&apos;s go!
        </button>
      </div>
    );
  }

  if (outOfHearts) {
    return (
      <OutOfHearts
        gems={user.stats.gems}
        onRefill={async () => {
          await action({ type: "buy", item: "refill" });
          setOutOfHearts(false);
        }}
        onUnlimited={async () => {
          await action({ type: "settings", settings: { unlimitedHearts: true } });
          setOutOfHearts(false);
        }}
        onQuit={() => router.push("/practice")}
      />
    );
  }

  function showCorrect(note: string) {
    sfx.correct();
    setStatus("correct");
    const c = combo + 1;
    setCombo(c);
    setMaxCombo(Math.max(maxCombo, c));
    const praise = c >= 5 ? `🔥 ${c} in a row!` : ["Nice!", "Great job!", "Correct!", "Excellent!", "You got it!"][Math.floor(Math.random() * 5)];
    setFeedback({ title: praise, detail: note });
  }

  function showWrong(note: string, correctAnswer: string) {
    if (!item) return;
    sfx.wrong();
    setStatus("wrong");
    setCombo(0);
    if (!item.retry) setQueue((q) => [...q, { ex: item.ex, retry: true, key: item.key }]);
    setFeedback({ title: "Not quite", detail: note, correctAnswer: correctAnswer || undefined });
    if (LIVES_MODES.includes(mode) && !item.retry) setLivesLost((l) => l + 1);
  }

  /** Sends the answer to the server, which grades it, records it and charges hearts. */
  async function submit(given: string, selfReportCorrect?: boolean, overrideNote?: string) {
    if (!item || status !== "answering") return;
    setStatus("checking");
    try {
      const v = await api<Verdict>("/api/lesson/check", { sessionId, index: item.key, answer: given, selfReportCorrect });
      setUser(v.user);
      setStatus("answering");
      if (v.correct) showCorrect(overrideNote ?? (v.note || v.explanation));
      else {
        showWrong(overrideNote ?? (v.note || v.explanation), v.correctAnswer);
        if (HEART_MODES.includes(mode) && !v.user.settings.unlimitedHearts && v.user.stats.hearts <= 0) setTimeout(() => setOutOfHearts(true), 1200);
      }
      setFeedback((f) => ({ ...f, correctAnswer: v.correct ? undefined : v.correctAnswer || undefined }));
      setLastExpected(v.correctAnswer);
    } catch (e) {
      setStatus("answering");
      setCheckError((e as Error).message);
      setTimeout(() => setCheckError(""), 5000);
    }
  }

  function check() {
    if (!ex || status !== "answering") return;
    void submit(answer);
  }

  function next() {
    if (LIVES_MODES.includes(mode) && livesLost >= maxLives) {
      void finish();
      return;
    }
    setStatus("answering");
    setAnswer("");
    if (index + 1 >= queue.length) void finish();
    else setIndex(index + 1);
  }

  const canCheck = !!answer.trim();
  const progress = queue.length ? index / queue.length : 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col">
      <div className="flex items-center gap-4 px-4 pt-6">
        <button className="text-2xl text-ink/40 hover:text-ink" onClick={() => setQuitOpen(true)} aria-label="Quit">
          ✕
        </button>
        <ProgressBar value={progress} />
        {combo >= 3 && <span className="animate-pop font-display font-bold text-coral-500">🔥{combo}</span>}
        {LIVES_MODES.includes(mode) ? (
          <span className="whitespace-nowrap font-display text-lg font-bold text-coral-500">{"❤️".repeat(Math.max(0, maxLives - livesLost))}</span>
        ) : (
          <span className="whitespace-nowrap font-display text-lg font-bold text-coral-500">❤️ {unlimited || !HEART_MODES.includes(mode) ? "∞" : hearts}</span>
        )}
      </div>

      <div className="flex-1 px-4 pb-48 pt-8 sm:px-8" key={`${index}-${item?.key}`}>
        {item?.retry && <div className="mb-3 inline-block rounded-xl bg-coral-100 px-3 py-1 text-sm font-bold text-coral-600">↻ Previous mistake</div>}
        {ex && (
          <ExerciseView
            ex={ex}
            ttsLang={lang.tts}
            langId={lang.id}
            rtl={!!lang.rtl}
            showRoman={showRoman}
            locked={status !== "answering"}
            answer={answer}
            setAnswer={setAnswer}
            onMatchDone={(errors) =>
              submit(`${errors} wrong matches`, errors <= 2, errors === 0 ? "" : errors > 2 ? `${errors} wrong matches` : `${errors} slip${errors > 1 ? "s" : ""} along the way`)
            }
            onSpeakResult={(text, ok) => submit(text, ok, ok ? "" : "That didn't quite sound right. Listen and try once more later!")}
            onSkipSpeaking={async () => {
              await action({ type: "disableSpeaking" });
              await submit("(skipped speaking)", true, "No problem! Speaking exercises are paused for an hour.");
            }}
            hideHints={LIVES_MODES.includes(mode)}
            nativeName={native.name}
          />
        )}
      </div>

      {checkError && (
        <div className="fixed inset-x-0 bottom-28 z-40 mx-auto w-fit max-w-md animate-pop rounded-2xl bg-coral-500 px-4 py-2 text-center font-semibold text-white shadow-lg">
          {checkError}
        </div>
      )}
      <FooterBar
        ex={ex}
        status={status}
        feedback={feedback}
        canCheck={canCheck}
        onCheck={check}
        onSkip={() => submit("")}
        onContinue={next}
        onExplain={() => setExplainOpen(true)}
        showRoman={showRoman}
        toggleRoman={lang.romanize ? () => setShowRoman(!showRoman) : undefined}
      />

      <Modal open={quitOpen} onClose={() => setQuitOpen(false)}>
        <div className="text-center">
          <Mascot size={100} mood="sad" />
          <h2 className="mt-2 text-2xl font-bold">Wait, don't go!</h2>
          <p className="mt-1 text-ink/70">You'll lose your progress in this lesson if you quit now.</p>
          <button className="btn btn-primary mt-5 w-full" onClick={() => setQuitOpen(false)}>
            Keep learning
          </button>
          <Link href="/learn" className="btn btn-ghost mt-2 w-full text-coral-500">
            End session
          </Link>
        </div>
      </Modal>

      {ex && explainOpen && <ExplainModal ex={ex} expected={lastExpected} given={answer} onClose={() => setExplainOpen(false)} ttsLang={lang.tts} />}
    </div>
  );
}

// ---------------------------------------------------------------------------

function Speaker({ text, lang, size = "lg" }: { text: string; lang: string; size?: "lg" | "sm" }) {
  return (
    <span className="inline-flex gap-2">
      <button
        className={`flex items-center justify-center rounded-2xl bg-sky2-500 text-white shadow-[0_4px_0_#1689e0] active:translate-y-1 ${size === "lg" ? "h-20 w-20 text-4xl" : "h-10 w-10 text-xl"}`}
        onClick={() => speak(text, lang)}
        aria-label="Play audio"
      >
        🔊
      </button>
      {size === "lg" && (
        <button
          className="flex h-14 w-14 items-center justify-center self-end rounded-2xl bg-sky2-500 text-2xl text-white shadow-[0_4px_0_#1689e0] active:translate-y-1"
          onClick={() => speak(text, lang, { slow: true })}
          aria-label="Play slowly"
        >
          🐢
        </button>
      )}
    </span>
  );
}

function PromptBubble({ text, roman, lang, showRoman, speakable = true }: { text: string; roman: string; lang: string; showRoman: boolean; speakable?: boolean }) {
  return (
    <div className="flex items-end gap-3">
      <Mascot size={90} />
      <div className="relative rounded-2xl border-2 border-grape-100 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          {speakable && (
            <button className="text-xl" onClick={() => speak(text, lang)} aria-label="Listen">
              🔊
            </button>
          )}
          <span className="text-xl font-semibold" dir="auto">
            {text}
          </span>
        </div>
        {showRoman && roman && <div className="mt-1 text-sm text-grape-600">{roman}</div>}
      </div>
    </div>
  );
}

function Options({ options, value, onChange, locked }: { options: string[]; value: string; onChange: (v: string) => void; locked: boolean }) {
  const shuffled = useMemo(() => shuffle(options), [options]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (!locked && n >= 1 && n <= shuffled.length) onChange(shuffled[n - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shuffled, locked, onChange]);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {shuffled.map((o, i) => (
        <button
          key={o + i}
          disabled={locked}
          className={`chip flex items-center gap-3 text-lg ${value === o ? "chip-on" : ""}`}
          onClick={() => {
            sfx.tap();
            onChange(o);
          }}
          dir="auto"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-grape-100 text-sm text-ink/50">{i + 1}</span>
          {o}
        </button>
      ))}
    </div>
  );
}

function WordBank({ words, setAnswer, locked, joiner }: { words: string[]; setAnswer: (v: string) => void; locked: boolean; joiner: string }) {
  const tiles = useMemo(() => shuffle(words.map((w, i) => ({ w, i }))), [words]);
  const [picked, setPicked] = useState<number[]>([]);
  useEffect(() => {
    setAnswer(picked.map((i) => words[i]).join(joiner));
  }, [picked]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div>
      <div className="mb-6 flex min-h-[64px] flex-wrap gap-2 border-b-2 border-t-2 border-grape-100 py-3">
        {picked.map((i) => (
          <button
            key={i}
            disabled={locked}
            className="chip animate-pop px-3 py-2 text-lg"
            onClick={() => {
              sfx.tap();
              setPicked(picked.filter((x) => x !== i));
            }}
            dir="auto"
          >
            {words[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {tiles.map(({ w, i }) => {
          const used = picked.includes(i);
          return (
            <button
              key={i}
              disabled={locked || used}
              className={`chip px-3 py-2 text-lg ${used ? "border-grape-100 bg-grape-100 text-transparent shadow-none" : ""}`}
              onClick={() => {
                sfx.tap();
                setPicked([...picked, i]);
              }}
              dir="auto"
            >
              {w}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MatchPairs({ pairs, lang, locked, onDone }: { pairs: { left: string; right: string }[]; lang: string; locked: boolean; onDone: (errors: number) => void }) {
  const left = useMemo(() => shuffle(pairs.map((p, i) => ({ t: p.left, i }))), [pairs]);
  const right = useMemo(() => shuffle(pairs.map((p, i) => ({ t: p.right, i }))), [pairs]);
  const [selL, setSelL] = useState<number | null>(null);
  const [selR, setSelR] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [wrong, setWrong] = useState<[number, number] | null>(null);
  const [errors, setErrors] = useState(0);

  useEffect(() => {
    if (selL === null || selR === null) return;
    if (selL === selR) {
      sfx.correct();
      const m = [...matched, selL];
      setMatched(m);
      setSelL(null);
      setSelR(null);
      if (m.length === pairs.length) onDone(errors);
    } else {
      sfx.wrong();
      setErrors((e) => e + 1);
      setWrong([selL, selR]);
      setTimeout(() => {
        setWrong(null);
        setSelL(null);
        setSelR(null);
      }, 600);
    }
  }, [selL, selR]); // eslint-disable-line react-hooks/exhaustive-deps

  const cls = (side: "l" | "r", i: number) => {
    if (matched.includes(i)) return "border-mint-100 bg-mint-100 text-mint-600 opacity-60 shadow-none";
    if (wrong && (side === "l" ? wrong[0] : wrong[1]) === i) return "animate-shake border-coral-400 bg-coral-100";
    if ((side === "l" ? selL : selR) === i) return "chip-on";
    return "";
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-3">
        {left.map(({ t, i }) => (
          <button
            key={i}
            disabled={locked || matched.includes(i)}
            className={`chip w-full text-center text-lg ${cls("l", i)}`}
            onClick={() => {
              speak(t, lang);
              setSelL(i);
            }}
            dir="auto"
          >
            {t}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {right.map(({ t, i }) => (
          <button key={i} disabled={locked || matched.includes(i)} className={`chip w-full text-center text-lg ${cls("r", i)}`} onClick={() => setSelR(i)} dir="auto">
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

function SpeakExercise({
  sentence,
  roman,
  lang,
  showRoman,
  locked,
  onResult,
  onSkip,
}: {
  sentence: string;
  roman: string;
  lang: string;
  showRoman: boolean;
  locked: boolean;
  onResult: (text: string, ok: boolean) => void;
  onSkip: () => void;
}) {
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [err, setErr] = useState("");
  const stopRef = useRef<() => void>(() => {});
  const supported = canRecognize();

  function start() {
    setErr("");
    setHeard("");
    setListening(true);
    let finalText = "";
    stopRef.current = listen(lang, {
      onResult: (t, final) => {
        setHeard(t);
        if (final) finalText = t;
      },
      onEnd: () => {
        setListening(false);
        const text = finalText;
        if (text) onResult(text, similarity(text, sentence) >= 0.7);
      },
      onError: (e) => setErr(e),
    });
  }

  return (
    <div>
      <PromptBubble text={sentence} roman={roman} lang={lang} showRoman={showRoman} />
      <div className="mt-10 flex flex-col items-center gap-4">
        {supported ? (
          <button
            disabled={locked}
            onClick={() => (listening ? stopRef.current() : start())}
            className={`flex h-24 w-full max-w-sm items-center justify-center gap-3 rounded-2xl border-2 font-display text-lg font-bold uppercase ${
              listening ? "animate-pulseglow border-grape-400 bg-grape-50 text-grape-600" : "border-grape-100 bg-white text-sky2-500 shadow-[0_4px_0_#e9e3ff]"
            }`}
          >
            🎤 {listening ? "Listening… tap to stop" : "Tap to speak"}
          </button>
        ) : (
          <p className="text-center text-ink/60">Speech recognition isn't available in this browser (try Chrome or Edge).</p>
        )}
        {heard && <p className="text-lg text-ink/70" dir="auto">“{heard}”</p>}
        {err && <p className="text-sm font-semibold text-coral-600">{err}</p>}
        <button className="font-bold uppercase text-ink/40 hover:text-ink/70" onClick={onSkip} disabled={locked}>
          Can't speak now
        </button>
      </div>
    </div>
  );
}

function ExerciseView(props: {
  ex: Exercise;
  ttsLang: string;
  langId: string;
  rtl: boolean;
  showRoman: boolean;
  locked: boolean;
  answer: string;
  setAnswer: (v: string) => void;
  onMatchDone: (errors: number) => void;
  onSpeakResult: (text: string, ok: boolean) => void;
  onSkipSpeaking: () => void;
  hideHints: boolean;
  nativeName: string;
}) {
  const { ex, ttsLang, showRoman, locked, answer, setAnswer } = props;
  const [hint, setHint] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (["translate_type", "listen_type"].includes(ex.type)) inputRef.current?.focus();
  }, [ex.type]);

  const title = <h1 className="mb-6 text-2xl font-bold sm:text-3xl">{ex.instruction}</h1>;
  const hintEl =
    !props.hideHints && ex.hint && ex.type !== "teach" ? (
      <div className="mt-6">
        {hint ? (
          <p className="rounded-2xl bg-sun-100 p-3 text-sm font-semibold">💡 {ex.hint}</p>
        ) : (
          <button className="text-sm font-bold text-grape-500" onClick={() => setHint(true)}>
            💡 Show hint
          </button>
        )}
      </div>
    ) : null;
  const typeArea = (placeholder: string) => (
    <textarea
      ref={inputRef}
      disabled={locked}
      className="input min-h-32 resize-none text-xl"
      placeholder={placeholder}
      value={answer}
      onChange={(e) => setAnswer(e.target.value)}
      dir="auto"
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) e.preventDefault();
      }}
    />
  );

  switch (ex.type) {
    case "teach": {
      const v = ex.newVocab[0];
      return (
        <div className="flex flex-col items-center text-center">
          <div className="mb-2 rounded-full bg-mint-100 px-3 py-1 text-sm font-bold uppercase text-mint-600">✨ New word</div>
          {title}
          <div className="card w-full max-w-md p-8">
            <div className="text-4xl font-bold" dir="auto">
              {ex.prompt}
            </div>
            {showRoman && (ex.promptRomanization || v?.romanization) && <div className="mt-2 text-lg text-grape-600">{ex.promptRomanization || v?.romanization}</div>}
            <div className="mt-4 text-xl text-ink/70">{ex.correctAnswer}</div>
            <div className="mt-6 flex justify-center">
              <Speaker text={ex.audioText || ex.prompt} lang={ttsLang} />
            </div>
            {ex.explanation && <p className="mt-6 text-left text-sm text-ink/70">💡 {ex.explanation}</p>}
          </div>
        </div>
      );
    }
    case "multiple_choice":
      return (
        <div>
          {title}
          {ex.prompt && <PromptBubble text={ex.prompt} roman={ex.promptRomanization} lang={ttsLang} showRoman={showRoman} speakable={ex.answerLanguage === "native"} />}
          <div className="mt-8">
            <Options options={ex.options} value={answer} onChange={setAnswer} locked={locked} />
          </div>
          {hintEl}
        </div>
      );
    case "fill_blank":
      return (
        <div>
          {title}
          <div className="card mb-8 p-6 text-center text-2xl font-semibold" dir="auto">
            {ex.prompt.split("___").map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span className={`mx-1 inline-block min-w-16 border-b-4 px-2 ${answer ? "border-grape-400 text-grape-600" : "border-ink/20"}`}>{answer || " "}</span>
                )}
              </span>
            ))}
            {showRoman && ex.promptRomanization && <div className="mt-2 text-base font-normal text-grape-600">{ex.promptRomanization}</div>}
          </div>
          <Options options={ex.options} value={answer} onChange={setAnswer} locked={locked} />
          {hintEl}
        </div>
      );
    case "translate_build":
    case "translate_type": {
      const promptInTarget = ex.answerLanguage === "native";
      const joiner = ex.answerLanguage === "target" && NO_SPACE_LANGS.includes(props.langId) ? "" : " ";
      return (
        <div>
          {title}
          <PromptBubble text={ex.prompt} roman={ex.promptRomanization} lang={ttsLang} showRoman={showRoman} speakable={promptInTarget} />
          <div className="mt-8">
            {ex.type === "translate_build" && ex.wordBank.length ? (
              <WordBank words={ex.wordBank} setAnswer={setAnswer} locked={locked} joiner={joiner} />
            ) : (
              typeArea(ex.answerLanguage === "target" ? "Type in the language you're learning" : `Type in ${props.nativeName}`)
            )}
          </div>
          {hintEl}
        </div>
      );
    }
    case "listen_type":
      return (
        <div>
          {title}
          <div className="mb-8 flex justify-center">
            <Speaker text={ex.audioText} lang={ttsLang} />
          </div>
          {typeArea("Type what you hear")}
          {hintEl}
        </div>
      );
    case "listen_choice":
      return (
        <div>
          {title}
          <div className="mb-8 flex justify-center">
            <Speaker text={ex.audioText} lang={ttsLang} />
          </div>
          <Options options={ex.options} value={answer} onChange={setAnswer} locked={locked} />
          {hintEl}
        </div>
      );
    case "match_pairs":
      return (
        <div>
          {title}
          <MatchPairs pairs={ex.pairs} lang={ttsLang} locked={locked} onDone={props.onMatchDone} />
        </div>
      );
    case "speak":
      return (
        <div>
          {title}
          <SpeakExercise
            sentence={ex.correctAnswer || ex.prompt}
            roman={ex.promptRomanization}
            lang={ttsLang}
            showRoman={showRoman}
            locked={locked}
            onResult={props.onSpeakResult}
            onSkip={props.onSkipSpeaking}
          />
        </div>
      );
    default:
      return null;
  }
}

function FooterBar({
  ex,
  status,
  feedback,
  canCheck,
  onCheck,
  onSkip,
  onContinue,
  onExplain,
  showRoman,
  toggleRoman,
}: {
  ex?: Exercise;
  status: Status;
  feedback: { title: string; detail: string; correctAnswer?: string };
  canCheck: boolean;
  onCheck: () => void;
  onSkip: () => void;
  onContinue: () => void;
  onExplain: () => void;
  showRoman: boolean;
  toggleRoman?: () => void;
}) {
  const isTeach = ex?.type === "teach";
  const selfChecking = ex?.type === "match_pairs" || ex?.type === "speak";
  const answered = status === "correct" || status === "wrong";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (answered || isTeach) onContinue();
      else if (canCheck && status === "answering" && !selfChecking) onCheck();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answered, isTeach, canCheck, status, selfChecking, onCheck, onContinue]);

  const bg = status === "correct" ? "bg-mint-100" : status === "wrong" ? "bg-coral-100" : "bg-white";
  return (
    <div className={`fixed inset-x-0 bottom-0 z-30 border-t-2 border-grape-100 ${bg} ${answered ? "animate-slideup" : ""}`}>
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        {answered ? (
          <div className="flex min-w-0 items-start gap-3">
            <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-3xl ${status === "correct" ? "bg-white text-mint-500" : "bg-white text-coral-500"}`}>
              {status === "correct" ? "✓" : "✕"}
            </span>
            <div className="min-w-0">
              <div className={`font-display text-2xl font-bold ${status === "correct" ? "text-mint-600" : "text-coral-600"}`}>{feedback.title}</div>
              {feedback.correctAnswer && (
                <div className="font-semibold text-coral-600" dir="auto">
                  Correct answer: {feedback.correctAnswer}
                </div>
              )}
              {feedback.detail && <div className={`text-sm ${status === "correct" ? "text-mint-600" : "text-coral-600"}`}>{feedback.detail}</div>}
              <button className={`mt-1 text-sm font-bold uppercase ${status === "correct" ? "text-mint-600" : "text-coral-600"}`} onClick={onExplain}>
                🤖 Explain my answer
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            {!isTeach && !selfChecking && (
              <button className="btn btn-ghost hidden sm:inline-flex" onClick={onSkip} disabled={status !== "answering"}>
                Skip
              </button>
            )}
            {toggleRoman && (
              <button className="btn btn-ghost hidden text-xs sm:inline-flex" onClick={toggleRoman}>
                {showRoman ? "Hide" : "Show"} romanization
              </button>
            )}
          </div>
        )}
        {answered || isTeach ? (
          <button className={`btn ${status === "wrong" ? "btn-coral" : "btn-mint"} w-full sm:w-44`} onClick={onContinue}>
            Continue
          </button>
        ) : selfChecking ? (
          <span />
        ) : (
          <button className="btn btn-mint w-full sm:w-44" disabled={!canCheck || status === "checking"} onClick={onCheck}>
            {status === "checking" ? <Spinner /> : "Check"}
          </button>
        )}
      </div>
    </div>
  );
}

function ExplainModal({ ex, expected, given, onClose, ttsLang }: { ex: Exercise; expected: string; given: string; onClose: () => void; ttsLang: string }) {
  const [data, setData] = useState<{ explanation: string; examples: { sentence: string; romanization: string; translation: string }[]; tip: string } | null>(null);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);

  async function ask(q?: string) {
    setBusy(true);
    setError("");
    try {
      const res = await api<typeof data>("/api/ai/explain", { instruction: ex.instruction, prompt: ex.prompt || ex.audioText, expected: expected || ex.correctAnswer, given, question: q });
      setData(res);
      setQuestion("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void ask();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open onClose={onClose}>
      <div className="flex items-center gap-3">
        <Mascot size={56} mood="think" />
        <h2 className="text-xl font-bold">Explain my answer</h2>
      </div>
      {error && <p className="mt-3 text-coral-600">{error}</p>}
      {busy && !data && (
        <div className="flex justify-center p-8 text-grape-500">
          <Spinner />
        </div>
      )}
      {data && (
        <div className="mt-4 space-y-4">
          <p className="whitespace-pre-line text-ink/85">{data.explanation}</p>
          <div className="space-y-2">
            {data.examples.map((e) => (
              <button key={e.sentence} className="w-full rounded-2xl bg-grape-50 p-3 text-left" onClick={() => speak(e.sentence, ttsLang)}>
                <div className="font-semibold" dir="auto">
                  🔊 {e.sentence}
                </div>
                {e.romanization && <div className="text-sm text-grape-600">{e.romanization}</div>}
                <div className="text-sm text-ink/60">{e.translation}</div>
              </button>
            ))}
          </div>
          {data.tip && <p className="rounded-2xl bg-sun-100 p-3 text-sm font-semibold">💡 {data.tip}</p>}
        </div>
      )}
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim()) void ask(question);
        }}
      >
        <input className="input py-2 text-base" placeholder="Ask a follow-up question…" value={question} onChange={(e) => setQuestion(e.target.value)} />
        <button className="btn btn-primary px-4" disabled={busy || !question.trim()}>
          {busy ? <Spinner /> : "Ask"}
        </button>
      </form>
      <button className="btn btn-ghost mt-3 w-full" onClick={onClose}>
        Close
      </button>
    </Modal>
  );
}

function OutOfHearts({ gems, onRefill, onUnlimited, onQuit }: { gems: number; onRefill: () => void; onUnlimited: () => void; onQuit: () => void }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <Mascot size={130} mood="sad" />
      <h1 className="text-3xl font-bold">You ran out of hearts!</h1>
      <p className="text-ink/70">Mistakes are how we learn. Here's how to keep going — all free:</p>
      <button className="btn btn-mint w-full" onClick={onQuit}>
        🏋️ Practice to earn hearts
      </button>
      <button className="btn btn-sun w-full" onClick={onRefill} disabled={gems < 350}>
        ❤️ Refill for 350 💎 {gems < 350 ? `(you have ${gems})` : ""}
      </button>
      <button className="btn btn-ghost w-full" onClick={onUnlimited}>
        ♾️ Turn on unlimited hearts
      </button>
    </div>
  );
}

function LessonComplete({ finished, user, onContinue }: { finished: { xp: number; result: LessonResult; events: string[] }; user: UserState; onContinue: () => void }) {
  const { result, xp, events } = finished;
  const [screen, setScreen] = useState(0);
  const accuracy = result.total ? Math.round((result.correct / result.total) * 100) : 100;
  const mins = Math.floor(result.durationSec / 60);
  const secs = result.durationSec % 60;
  const today = dayKey(new Date(), user.settings.timezone);
  const goal = dailyXpGoal(user.settings.dailyMinutes);

  const screens: ("summary" | "streak" | "goal")[] = ["summary"];
  if (events.includes("streak")) screens.push("streak");
  if (events.includes("dailyGoal")) screens.push("goal");
  const current = screens[screen];

  const advance = () => (screen + 1 < screens.length ? setScreen(screen + 1) : onContinue());

  if (!result.passed) {
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
        <Mascot size={130} mood="sad" />
        <h1 className="text-3xl font-bold">{result.mode === "test_out" ? "Not quite yet!" : "Challenge failed"}</h1>
        <p className="text-ink/70">
          You got {result.correct}/{result.total} ({accuracy}%). {result.mode === "test_out" ? "You need 80% to jump ahead." : ""} Your mistakes were saved for practice.
        </p>
        <button className="btn btn-primary w-full" onClick={onContinue}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-6 text-center" key={current}>
      {current === "summary" && (
        <>
          <Mascot size={150} mood="wow" outfit={user.avatar.outfit} className="animate-pop" />
          <h1 className="text-3xl font-bold text-sun-600">{accuracy === 100 ? "Perfect lesson!" : "Lesson complete!"}</h1>
          <div className="grid w-full grid-cols-3 gap-3">
            <Stat label="Total XP" value={`⚡ ${xp}`} color="#ffb800" />
            <Stat label={accuracy >= 90 ? "Amazing" : accuracy >= 70 ? "Good" : "Accuracy"} value={`🎯 ${accuracy}%`} color="#1fc47f" />
            <Stat label="Time" value={`⏱ ${mins}:${String(secs).padStart(2, "0")}`} color="#2fa8ff" />
          </div>
          {result.newVocab.length > 0 && <p className="font-semibold text-ink/60">+{result.newVocab.length} new words added to your review deck 🃏</p>}
          {events.includes("heart") && <p className="font-semibold text-coral-500">+1 heart earned ❤️</p>}
          {events.includes("jumped") && <p className="font-semibold text-mint-600">You jumped ahead! ⏩</p>}
        </>
      )}
      {current === "streak" && (
        <>
          <div className="animate-pop text-[120px] leading-none">🔥</div>
          <h1 className="font-display text-6xl font-extrabold text-coral-500">{user.stats.streak}</h1>
          <h2 className="text-2xl font-bold">day streak!</h2>
          <div className="flex gap-2">
            {Array.from({ length: 7 }, (_, i) => {
              const d = new Date();
              d.setDate(d.getDate() - (6 - i));
              const k = dayKey(d, user.settings.timezone);
              return (
                <div key={k} className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${user.stats.activeDays.includes(k) ? "bg-coral-500 text-white" : "bg-grape-50 text-ink/30"}`}>
                  {k === today ? "✓" : ["S", "M", "T", "W", "T", "F", "S"][d.getDay()]}
                </div>
              );
            })}
          </div>
          <p className="text-ink/60">Practice every day to keep your streak growing!</p>
        </>
      )}
      {current === "goal" && (
        <>
          <div className="animate-pop text-[110px] leading-none">🎁</div>
          <h1 className="text-3xl font-bold">Daily goal reached!</h1>
          <p className="text-ink/70">
            You earned {goal} XP today. Here's a chest: <b>+20 💎</b>
          </p>
        </>
      )}
      <button className="btn btn-primary w-full py-4 text-lg" onClick={advance}>
        Continue
      </button>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border-2" style={{ borderColor: color }}>
      <div className="py-1 text-xs font-bold uppercase text-white" style={{ background: color }}>
        {label}
      </div>
      <div className="py-3 font-display text-lg font-bold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
