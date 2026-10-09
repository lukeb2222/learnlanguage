"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/components/UserProvider";
import { ErrorBox, LoadingScreen } from "@/components/ui";
import { api } from "@/lib/client";
import { getLanguage } from "@/lib/languages";
import { speak } from "@/lib/speech";

interface Chart {
  intro: string;
  groups: { title: string; characters: { char: string; romanization: string; sound: string; example: string; exampleMeaning: string }[] }[];
}

export default function LettersPage() {
  return (
    <AppShell>
      <Letters />
    </AppShell>
  );
}

function Letters() {
  const { course } = useUser();
  const [chart, setChart] = useState<Chart | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const lang = course ? getLanguage(course.languageId) : null;

  async function load() {
    setError("");
    try {
      setChart(await api<Chart>("/api/ai/letters", {}));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (course) void load();
  }, [course?.languageId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!lang) return null;
  if (!lang.romanize)
    return (
      <div className="py-10 text-center">
        <h1 className="text-2xl font-bold">{lang.name} uses the Latin alphabet</h1>
        <p className="mt-2 text-ink/60">No new characters to learn — head to the Learn tab!</p>
      </div>
    );
  if (error) return <ErrorBox message={error} onRetry={load} />;
  if (!chart) return <LoadingScreen title={`Building your ${lang.script} chart…`} />;

  return (
    <div className="py-6">
      <h1 className="text-3xl font-bold">Let's learn {lang.script}!</h1>
      <p className="mt-1 text-ink/60">{chart.intro}</p>
      <Link href="/lesson?mode=letters" className="btn btn-primary mt-4 w-full">
        ✍️ Practice characters
      </Link>
      {chart.groups.map((g) => (
        <section key={g.title} className="mt-8">
          <h2 className="mb-3 text-xl font-bold">{g.title}</h2>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
            {g.characters.map((c) => {
              const id = g.title + c.char;
              return (
                <button
                  key={id}
                  className={`chip flex flex-col items-center p-3 text-center ${open === id ? "chip-on" : ""}`}
                  onClick={() => {
                    speak(c.char, lang.tts);
                    setOpen(open === id ? null : id);
                  }}
                >
                  <span className="text-3xl">{c.char}</span>
                  <span className="text-sm text-ink/60">{c.romanization}</span>
                </button>
              );
            })}
          </div>
          {g.characters
            .filter((c) => open === g.title + c.char)
            .map((c) => (
              <div key={c.char} className="card mt-3 animate-pop p-4">
                <div className="flex items-center gap-3">
                  <span className="text-5xl">{c.char}</span>
                  <div>
                    <div className="font-bold">{c.romanization}</div>
                    <div className="text-sm text-ink/70">{c.sound}</div>
                  </div>
                </div>
                <button className="mt-3 text-left" onClick={() => speak(c.example, lang.tts)}>
                  🔊 <b dir="auto">{c.example}</b> — {c.exampleMeaning}
                </button>
              </div>
            ))}
        </section>
      ))}
    </div>
  );
}
