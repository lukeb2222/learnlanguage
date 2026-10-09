"use client";

import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/components/UserProvider";
import { Mascot, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import { getLanguage } from "@/lib/languages";
import { canRecognize, listen, speak, stopSpeaking } from "@/lib/speech";
import type { ChatTurn, UserState } from "@/lib/types";

interface Scenario {
  title: string;
  emoji: string;
  role: string;
  goal: string;
}

const DEFAULT_SCENARIOS: Scenario[] = [
  { title: "Free conversation", emoji: "💬", role: "a friendly, curious local who loves chatting", goal: "Chat about anything you like" },
  { title: "Ordering at a café", emoji: "☕", role: "a barista at a busy café", goal: "Order a drink and a snack, and pay" },
  { title: "Asking for directions", emoji: "🗺️", role: "a helpful passer-by in the city centre", goal: "Find your way to the train station" },
  { title: "Making a new friend", emoji: "🤝", role: "someone you just met at a party", goal: "Introduce yourself and find shared interests" },
  { title: "At the doctor", emoji: "🩺", role: "a kind doctor", goal: "Describe how you feel and understand the advice" },
  { title: "Job interview", emoji: "💼", role: "a hiring manager", goal: "Talk about your experience and strengths" },
];

export default function TutorPage() {
  return (
    <AppShell rail={false}>
      <Tutor />
    </AppShell>
  );
}

function Tutor() {
  const { course, setUser } = useUser();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [aiScenarios, setAiScenarios] = useState<Scenario[]>([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [voice, setVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [showTranslation, setShowTranslation] = useState<Record<number, boolean>>({});
  const stopRef = useRef<() => void>(() => {});
  const bottom = useRef<HTMLDivElement>(null);

  const lang = course ? getLanguage(course.languageId) : getLanguage("en");

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, busy]);

  useEffect(() => () => stopSpeaking(), []);

  async function send(history: ChatTurn[]) {
    if (!scenario) return;
    setBusy(true);
    setError("");
    try {
      const res = await api<{
        reply: string;
        replyRomanization: string;
        translation: string;
        corrections: ChatTurn["corrections"];
        suggestions: string[];
        user: UserState;
      }>("/api/ai/chat", { scenario, history: history.map((t) => ({ role: t.role, text: t.text })), voice });
      setUser(res.user);
      const next: ChatTurn[] = [...history];
      // attach corrections to the learner's last message
      const lastUser = next.map((t) => t.role).lastIndexOf("user");
      if (lastUser >= 0 && res.corrections?.length) next[lastUser] = { ...next[lastUser], corrections: res.corrections };
      next.push({ role: "assistant", text: res.reply, romanization: res.replyRomanization, translation: res.translation, suggestions: res.suggestions });
      setTurns(next);
      speak(res.reply, lang.tts);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function begin(s: Scenario) {
    setScenario(s);
    setTurns([]);
    setShowTranslation({});
  }

  useEffect(() => {
    if (scenario && turns.length === 0) void send([]);
  }, [scenario]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit(text: string) {
    const t = text.trim();
    if (!t || busy) return;
    const history: ChatTurn[] = [...turns, { role: "user", text: t }];
    setTurns(history);
    setInput("");
    void send(history);
  }

  function talk() {
    if (listening) {
      stopRef.current();
      return;
    }
    stopSpeaking();
    setListening(true);
    let finalText = "";
    stopRef.current = listen(lang.tts, {
      onResult: (t, final) => {
        setInput(t);
        if (final) finalText = t;
      },
      onEnd: () => {
        setListening(false);
        if (finalText) submit(finalText);
      },
      onError: (e) => setError(e),
    });
  }

  async function loadAiScenarios() {
    setLoadingScenarios(true);
    try {
      const res = await api<{ scenarios: Scenario[] }>("/api/ai/scenarios", {});
      setAiScenarios(res.scenarios);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoadingScenarios(false);
    }
  }

  if (!course) return null;

  if (!scenario) {
    return (
      <div className="py-6">
        <div className="mb-6 flex items-center gap-4">
          <Mascot size={80} />
          <div>
            <h1 className="text-3xl font-bold">AI Conversation Partner</h1>
            <p className="text-ink/60">Role-play real situations in {lang.name} by text or voice. You'll get gentle corrections as you go.</p>
          </div>
        </div>
        <div className="mb-5 flex items-center justify-between rounded-2xl bg-white p-4 ring-2 ring-grape-100">
          <div>
            <div className="font-bold">📞 Voice call mode</div>
            <div className="text-sm text-ink/60">{canRecognize() ? "Speak out loud and hear replies, like a video call." : "Voice input needs Chrome or Edge."}</div>
          </div>
          <button
            className={`h-8 w-14 rounded-full p-1 transition ${voice ? "bg-mint-500" : "bg-grape-100"}`}
            onClick={() => setVoice(!voice)}
            aria-label="Toggle voice mode"
          >
            <span className={`block h-6 w-6 rounded-full bg-white transition ${voice ? "translate-x-6" : ""}`} />
          </button>
        </div>
        {error && <p className="mb-3 font-semibold text-coral-600">{error}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          {[...aiScenarios, ...DEFAULT_SCENARIOS].map((s) => (
            <button key={s.title} className="chip flex items-start gap-3 p-4" onClick={() => begin(s)}>
              <span className="text-3xl">{s.emoji}</span>
              <span>
                <span className="block font-bold">{s.title}</span>
                <span className="block text-sm font-normal text-ink/60">{s.goal}</span>
              </span>
            </button>
          ))}
        </div>
        {!aiScenarios.length && (
          <button className="btn btn-primary mt-5 w-full" onClick={loadAiScenarios} disabled={loadingScenarios}>
            {loadingScenarios ? <Spinner /> : "✨ Suggest scenarios for my goals"}
          </button>
        )}
      </div>
    );
  }

  const lastAssistant = [...turns].reverse().find((t) => t.role === "assistant");

  return (
    <div className="flex h-[calc(100vh-140px)] flex-col py-4 lg:h-[calc(100vh-40px)]">
      <div className="mb-3 flex items-center gap-3">
        <button className="text-2xl text-ink/40" onClick={() => setScenario(null)} aria-label="Back">
          ←
        </button>
        <span className="text-3xl">{scenario.emoji}</span>
        <div className="min-w-0">
          <div className="truncate font-bold">{scenario.title}</div>
          <div className="truncate text-sm text-ink/50">Goal: {scenario.goal}</div>
        </div>
        {voice && <span className="ml-auto rounded-full bg-coral-100 px-3 py-1 text-xs font-bold text-coral-600">📞 Call</span>}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto rounded-3xl bg-white p-4 ring-2 ring-grape-100">
        {voice && (
          <div className="flex justify-center py-4">
            <Mascot size={120} mood={busy ? "think" : listening ? "wow" : "happy"} className={busy || listening ? "animate-float" : ""} />
          </div>
        )}
        {turns.map((t, i) =>
          t.role === "assistant" ? (
            <div key={i} className="flex animate-pop items-start gap-2">
              <Mascot size={36} />
              <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-grape-50 p-3">
                <button className="block text-left text-lg" onClick={() => speak(t.text, lang.tts)} dir="auto">
                  {t.text}
                </button>
                {t.romanization && <div className="text-sm text-grape-600">{t.romanization}</div>}
                {showTranslation[i] ? (
                  <div className="mt-1 text-sm text-ink/60">{t.translation}</div>
                ) : (
                  <button className="mt-1 block text-xs font-bold uppercase text-grape-500" onClick={() => setShowTranslation({ ...showTranslation, [i]: true })}>
                    Translate
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div key={i} className="flex animate-pop flex-col items-end">
              <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-grape-500 p-3 text-lg text-white" dir="auto">
                {t.text}
              </div>
              {t.corrections?.map((c, j) => (
                <div key={j} className="mt-1 max-w-[80%] rounded-xl bg-sun-100 px-3 py-2 text-sm">
                  <span className="text-coral-600 line-through">{c.original}</span> → <b className="text-mint-600">{c.corrected}</b>
                  <div className="text-ink/60">{c.note}</div>
                </div>
              ))}
            </div>
          ),
        )}
        {busy && (
          <div className="flex items-center gap-2 text-grape-500">
            <Mascot size={36} mood="think" /> <Spinner />
          </div>
        )}
        {error && <p className="font-semibold text-coral-600">{error}</p>}
        <div ref={bottom} />
      </div>

      {lastAssistant?.suggestions?.length && !busy ? (
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
          <span className="shrink-0 self-center text-xs font-bold uppercase text-ink/40">Need help?</span>
          {lastAssistant.suggestions.map((s) => (
            <button key={s} className="chip shrink-0 px-3 py-1.5 text-sm" onClick={() => setInput(s)} dir="auto">
              {s}
            </button>
          ))}
        </div>
      ) : null}

      <form
        className="mt-3 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
      >
        {voice || canRecognize() ? (
          <button
            type="button"
            className={`btn ${listening ? "btn-coral animate-pulseglow" : "btn-ghost"} px-4`}
            onClick={talk}
            disabled={busy}
            aria-label="Speak"
          >
            🎤
          </button>
        ) : null}
        <input className="input" placeholder={`Reply in ${lang.name}…`} value={input} onChange={(e) => setInput(e.target.value)} dir="auto" />
        <button className="btn btn-primary px-5" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
