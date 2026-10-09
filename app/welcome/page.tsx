"use client";

import { useRouter } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useUser } from "@/components/UserProvider";
import { ErrorBox, LoadingScreen, Mascot, ProgressBar } from "@/components/ui";
import { api } from "@/lib/client";
import { FSI_LABEL, getLanguage, LANGUAGES } from "@/lib/languages";
import { AGE_GROUPS, CHALLENGES, CORRECTION_STYLES, DAILY_GOALS, GOALS, INTERESTS, LEARNING_STYLES, LEVELS } from "@/lib/profileOptions";
import type { Cefr, UserState } from "@/lib/types";
import { sfx } from "@/lib/sound";

interface Answers {
  targetLanguage: string;
  nativeLanguage: string;
  otherLanguages: string[];
  ageGroup: string;
  goals: string[];
  level: Cefr | "";
  interests: string[];
  learningStyles: string[];
  challenges: string[];
  correctionStyle: string;
  dailyMinutes: number;
  motivation: string;
}

type StepId =
  | "target"
  | "native"
  | "age"
  | "goals"
  | "level"
  | "interests"
  | "styles"
  | "challenges"
  | "correction"
  | "daily"
  | "motivation";

const STEP_TEXT: Record<StepId, string> = {
  target: "Hi there! I'm Glo. What would you like to learn?",
  native: "Which language should I teach you in?",
  age: "How old are you? I'll pick topics and examples that fit.",
  goals: "Why are you learning? Pick as many as you like.",
  level: "How much do you already know?",
  interests: "What are you into? I'll use these in your lessons.",
  styles: "How do you like to learn?",
  challenges: "What do you find hardest about learning languages?",
  correction: "When you make a mistake, how should I correct you?",
  daily: "What's your daily learning goal?",
  motivation: "Anything else your tutor should know?",
};

function Welcome() {
  const { user, loading, setUser, course: existingCourse } = useUser();
  const router = useRouter();
  const params = useSearchParams();
  const adding = params.get("add") === "1";

  const firstCourse = user ? Object.values(user.courses)[0] : undefined;
  const [answers, setAnswers] = useState<Answers>({
    targetLanguage: "",
    nativeLanguage: "",
    otherLanguages: [],
    ageGroup: "",
    goals: [],
    level: "",
    interests: [],
    learningStyles: [],
    challenges: [],
    correctionStyle: "balanced",
    dailyMinutes: 10,
    motivation: "",
  });
  const [step, setStep] = useState(0);
  const [phase, setPhase] = useState<"questions" | "placement" | "building" | "done" | "error">("questions");
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/signup");
  }, [loading, user, router]);

  // Resume plan generation if a course exists but has no plan yet.
  useEffect(() => {
    if (!loading && user && existingCourse && !existingCourse.plan && !adding && phase === "questions") {
      void buildPlan();
    } else if (!loading && user && existingCourse?.plan && !adding && phase === "questions") {
      router.replace("/learn");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user]);

  useEffect(() => {
    const nav = typeof navigator !== "undefined" ? navigator.language.split("-")[0] : "en";
    setAnswers((a) => ({
      ...a,
      nativeLanguage: a.nativeLanguage || firstCourse?.profile.nativeLanguage || (LANGUAGES.some((l) => l.id === nav) ? nav : "en"),
      ageGroup: a.ageGroup || firstCourse?.profile.ageGroup || "",
      otherLanguages: a.otherLanguages.length ? a.otherLanguages : (firstCourse?.profile.otherLanguages ?? []),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstCourse?.languageId]);

  const steps: StepId[] = useMemo(
    () =>
      (["target", "native", "age", "goals", "level", "interests", "styles", "challenges", "correction", "daily", "motivation"] as StepId[]).filter(
        (s) => !(adding && firstCourse && s === "age"),
      ),
    [adding, firstCourse],
  );
  const current = steps[step];
  const set = <K extends keyof Answers>(k: K, v: Answers[K]) => setAnswers((a) => ({ ...a, [k]: v }));
  const toggle = (k: "goals" | "interests" | "learningStyles" | "challenges" | "otherLanguages", v: string) =>
    setAnswers((a) => ({ ...a, [k]: a[k].includes(v) ? a[k].filter((x) => x !== v) : [...a[k], v] }));

  const canContinue = (() => {
    switch (current) {
      case "target":
        return !!answers.targetLanguage;
      case "native":
        return !!answers.nativeLanguage && answers.nativeLanguage !== answers.targetLanguage;
      case "age":
        return !!answers.ageGroup;
      case "goals":
        return answers.goals.length > 0;
      case "level":
        return !!answers.level;
      default:
        return true;
    }
  })();

  async function buildPlan() {
    setPhase("building");
    setError("");
    try {
      const { user } = await api<{ user: UserState }>("/api/ai/plan", {});
      setUser(user);
      setPhase("done");
      sfx.complete();
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  }

  async function finish() {
    setPhase("building");
    try {
      const { user } = await api<{ user: UserState }>("/api/course", answers);
      setUser(user);
      await buildPlan();
    } catch (e) {
      setError((e as Error).message);
      setPhase("error");
    }
  }

  function next() {
    sfx.tap();
    if (step < steps.length - 1) setStep(step + 1);
    else void finish();
  }

  if (!user) return <LoadingScreen title="Loading…" />;

  if (phase === "building") return <LoadingScreen title="Your AI tutor is designing your personal course…" />;
  if (phase === "error") return <ErrorBox message={error} onRetry={() => (existingCourse && !adding ? buildPlan() : finish())} />;
  if (phase === "placement")
    return (
      <Placement
        target={answers.targetLanguage}
        native={answers.nativeLanguage}
        ageGroup={answers.ageGroup}
        onDone={(lvl) => {
          if (lvl) set("level", lvl);
          setPhase("questions");
        }}
      />
    );
  if (phase === "done" && existingCourse?.plan) {
    const plan = existingCourse.plan;
    const lang = getLanguage(existingCourse.languageId);
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="flex flex-col items-center text-center">
          <Mascot size={130} mood="wow" className="animate-float" />
          <h1 className="mt-3 text-3xl font-bold">
            Your {lang.name} course is ready! {lang.flag}
          </h1>
          <p className="mt-2 text-ink/70">{plan.summary}</p>
        </div>
        <div className="card mt-6 p-6">
          <h2 className="mb-3 text-xl font-bold">How I'll teach you</h2>
          <ul className="space-y-2">
            {plan.approach.map((a) => (
              <li key={a} className="flex gap-2">
                <span>✨</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="card mt-4 p-6">
          <h2 className="mb-3 text-xl font-bold">Your path</h2>
          <div className="space-y-2">
            {plan.units.map((u, i) => (
              <div key={u.id} className="flex items-center gap-3">
                <span className="text-2xl">{u.emoji}</span>
                <span className="font-semibold">
                  Unit {i + 1}: {u.title}
                </span>
                <span className="ml-auto rounded-full bg-grape-50 px-2 py-0.5 text-xs font-bold text-grape-600">{u.cefr}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm text-ink/60">Difficulty for English speakers: {FSI_LABEL[lang.fsi]}. More units unlock as you go.</p>
        </div>
        <button className="btn btn-primary mt-6 w-full py-4 text-lg" onClick={() => router.push("/learn")}>
          Start learning
        </button>
      </div>
    );
  }

  const filteredLangs = LANGUAGES.filter(
    (l) => !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.native.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col p-4 sm:p-6">
      <div className="flex items-center gap-4">
        <button className="text-2xl text-ink/40 hover:text-ink" onClick={() => (step === 0 ? router.back() : setStep(step - 1))} aria-label="Back">
          ←
        </button>
        <ProgressBar value={(step + 1) / steps.length} color="#7c5cff" />
      </div>

      <div className="mt-6 flex items-end gap-3">
        <Mascot size={80} mood={current === "challenges" ? "think" : "happy"} />
        <div className="relative mb-4 rounded-2xl border-2 border-grape-100 bg-white px-4 py-3 font-display text-lg font-bold">
          {STEP_TEXT[current]}
        </div>
      </div>

      <div className="mt-4 flex-1 animate-pop" key={current}>
        {current === "target" && (
          <>
            <input className="input mb-4" placeholder={`Search ${LANGUAGES.length} languages…`} value={search} onChange={(e) => setSearch(e.target.value)} />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {filteredLangs.map((l) => (
                <button
                  key={l.id}
                  className={`chip flex items-center gap-3 ${answers.targetLanguage === l.id ? "chip-on" : ""} ${user.courses[l.id] ? "opacity-50" : ""}`}
                  onClick={() => set("targetLanguage", l.id)}
                  disabled={!!user.courses[l.id] && adding}
                >
                  <span className="text-3xl">{l.flag}</span>
                  <span className="min-w-0">
                    <span className="block truncate">{l.name}</span>
                    <span className="block truncate text-xs font-normal text-ink/50">{l.native}</span>
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {current === "native" && (
          <>
            <select className="input" value={answers.nativeLanguage} onChange={(e) => set("nativeLanguage", e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.flag} {l.name}
                </option>
              ))}
            </select>
            {answers.nativeLanguage === answers.targetLanguage && (
              <p className="mt-2 text-sm font-semibold text-coral-600">Choose a different language from the one you're learning.</p>
            )}
            <h3 className="mb-2 mt-6 font-bold">Other languages you speak (optional — helps me use cognates)</h3>
            <div className="flex flex-wrap gap-2">
              {LANGUAGES.filter((l) => l.id !== answers.nativeLanguage && l.id !== answers.targetLanguage).map((l) => (
                <button key={l.id} className={`chip px-3 py-1.5 text-sm ${answers.otherLanguages.includes(l.id) ? "chip-on" : ""}`} onClick={() => toggle("otherLanguages", l.id)}>
                  {l.flag} {l.name}
                </button>
              ))}
            </div>
          </>
        )}

        {current === "age" && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {AGE_GROUPS.map((a) => (
              <button key={a} className={`chip text-center ${answers.ageGroup === a ? "chip-on" : ""}`} onClick={() => set("ageGroup", a)}>
                {a}
              </button>
            ))}
          </div>
        )}

        {current === "goals" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {GOALS.map((g) => (
              <button key={g.id} className={`chip flex items-center gap-3 ${answers.goals.includes(g.label) ? "chip-on" : ""}`} onClick={() => toggle("goals", g.label)}>
                <span className="text-2xl">{g.icon}</span> {g.label}
              </button>
            ))}
          </div>
        )}

        {current === "level" && (
          <>
            <div className="grid gap-3">
              {LEVELS.map((l) => (
                <button key={l.id} className={`chip flex items-center gap-4 ${answers.level === l.id ? "chip-on" : ""}`} onClick={() => set("level", l.id)}>
                  <span className="text-3xl">{l.icon}</span>
                  <span>
                    <span className="block">{l.label}</span>
                    <span className="block text-sm font-normal text-ink/60">{l.desc}</span>
                  </span>
                  <span className="ml-auto rounded-full bg-grape-50 px-2 py-0.5 text-xs font-bold text-grape-600">{l.id}</span>
                </button>
              ))}
            </div>
            <button className="btn btn-ghost mt-4 w-full" onClick={() => setPhase("placement")}>
              🧪 Not sure? Take a quick AI placement test
            </button>
          </>
        )}

        {current === "interests" && (
          <div className="flex flex-wrap gap-2">
            {INTERESTS.map((i) => (
              <button key={i} className={`chip ${answers.interests.includes(i) ? "chip-on" : ""}`} onClick={() => toggle("interests", i)}>
                {i}
              </button>
            ))}
          </div>
        )}

        {current === "styles" && (
          <div className="grid gap-3 sm:grid-cols-2">
            {LEARNING_STYLES.map((s) => (
              <button
                key={s.id}
                className={`chip flex items-center gap-3 ${answers.learningStyles.includes(s.label) ? "chip-on" : ""}`}
                onClick={() => toggle("learningStyles", s.label)}
              >
                <span className="text-2xl">{s.icon}</span>
                <span>
                  <span className="block">{s.label}</span>
                  <span className="block text-sm font-normal text-ink/60">{s.desc}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {current === "challenges" && (
          <div className="flex flex-wrap gap-2">
            {CHALLENGES.map((c) => (
              <button key={c} className={`chip ${answers.challenges.includes(c) ? "chip-on" : ""}`} onClick={() => toggle("challenges", c)}>
                {c}
              </button>
            ))}
          </div>
        )}

        {current === "correction" && (
          <div className="grid gap-3">
            {CORRECTION_STYLES.map((c) => (
              <button key={c.id} className={`chip ${answers.correctionStyle === c.id ? "chip-on" : ""}`} onClick={() => set("correctionStyle", c.id)}>
                <span className="block">{c.label}</span>
                <span className="block text-sm font-normal text-ink/60">{c.desc}</span>
              </button>
            ))}
          </div>
        )}

        {current === "daily" && (
          <div className="grid gap-3">
            {DAILY_GOALS.map((d) => (
              <button key={d.minutes} className={`chip flex items-center gap-3 ${answers.dailyMinutes === d.minutes ? "chip-on" : ""}`} onClick={() => set("dailyMinutes", d.minutes)}>
                <span className="text-2xl">{d.icon}</span>
                <span>{d.minutes} min / day</span>
                <span className="ml-auto text-ink/50">{d.label}</span>
              </button>
            ))}
          </div>
        )}

        {current === "motivation" && (
          <textarea
            className="input min-h-40"
            placeholder="e.g. My grandmother speaks Hebrew and I want to talk with her. I have a trip to Madrid in June. I learn best with lots of examples…"
            value={answers.motivation}
            maxLength={500}
            onChange={(e) => set("motivation", e.target.value)}
          />
        )}
      </div>

      <div className="sticky bottom-0 mt-6 border-t-2 border-grape-100 bg-[#fbfaff] py-4">
        <button className="btn btn-primary w-full py-4 text-lg" disabled={!canContinue} onClick={next}>
          {step === steps.length - 1 ? "Build my course" : "Continue"}
        </button>
      </div>
    </div>
  );
}

interface PlacementQ {
  cefr: Cefr;
  question: string;
  prompt: string;
  options: string[];
  answer: string;
}

function Placement({ target, native, ageGroup, onDone }: { target: string; native: string; ageGroup: string; onDone: (l: Cefr | null) => void }) {
  const [questions, setQuestions] = useState<PlacementQ[] | null>(null);
  const [error, setError] = useState("");
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [results, setResults] = useState<{ cefr: Cefr; correct: boolean }[]>([]);
  const lang = getLanguage(target);

  async function load() {
    setError("");
    try {
      const res = await api<{ questions: PlacementQ[] }>("/api/ai/placement", { targetLanguage: target, nativeLanguage: native, ageGroup });
      setQuestions(res.questions);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!questions) return <LoadingScreen title={`Preparing your ${lang.name} placement test…`} />;

  if (i >= questions.length) {
    const order: Cefr[] = ["A1", "A2", "B1", "B2", "C1"];
    let level: Cefr = "pre-A1";
    for (const lvl of order) {
      const items = results.filter((r) => r.cefr === lvl);
      if (!items.length) continue;
      if (items.filter((r) => r.correct).length / items.length >= 0.6) level = lvl;
      else break;
    }
    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center p-6 text-center">
        <Mascot size={130} mood="wow" />
        <h1 className="mt-4 text-3xl font-bold">You placed at {level}!</h1>
        <p className="mt-2 text-ink/70">
          {results.filter((r) => r.correct).length} of {results.length} correct. Your course will start right at your level.
        </p>
        <button className="btn btn-primary mt-6 w-full" onClick={() => onDone(level)}>
          Continue
        </button>
      </div>
    );
  }

  const q = questions[i];
  const check = () => {
    const correct = picked === q.answer;
    if (correct) sfx.correct();
    else sfx.wrong();
    setResults([...results, { cefr: q.cefr, correct }]);
    setPicked(null);
    setI(i + 1);
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col p-6">
      <div className="flex items-center gap-4">
        <button className="text-2xl text-ink/40" onClick={() => onDone(null)}>
          ✕
        </button>
        <ProgressBar value={i / questions.length} />
      </div>
      <div className="mt-8 flex-1">
        <div className="text-sm font-bold uppercase text-grape-500">Placement · {q.cefr}</div>
        <h2 className="mt-1 text-2xl font-bold">{q.question}</h2>
        {q.prompt && (
          <p className="mt-4 rounded-2xl bg-grape-50 p-4 text-xl" dir={lang.rtl ? "auto" : undefined}>
            {q.prompt}
          </p>
        )}
        <div className="mt-6 grid gap-3">
          {q.options.map((o) => (
            <button key={o} className={`chip ${picked === o ? "chip-on" : ""}`} onClick={() => setPicked(o)} dir="auto">
              {o}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-3">
        <button className="btn btn-ghost flex-1" onClick={() => { setResults([...results, { cefr: q.cefr, correct: false }]); setPicked(null); setI(i + 1); }}>
          I don't know
        </button>
        <button className="btn btn-primary flex-1" disabled={!picked} onClick={check}>
          Check
        </button>
      </div>
    </div>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={<LoadingScreen title="Loading…" />}>
      <Welcome />
    </Suspense>
  );
}

