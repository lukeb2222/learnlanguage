"use client";

let voicesLoaded: SpeechSynthesisVoice[] = [];

function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  voicesLoaded = window.speechSynthesis.getVoices();
  return voicesLoaded;
}

if (typeof window !== "undefined" && window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export function canSpeak() {
  return typeof window !== "undefined" && !!window.speechSynthesis;
}

export function hasVoiceFor(lang: string) {
  const voices = voicesLoaded.length ? voicesLoaded : loadVoices();
  const base = lang.split("-")[0].toLowerCase();
  return voices.some((v) => v.lang.toLowerCase().startsWith(base));
}

/** Reads text aloud with the browser's speech synthesis. */
export function speak(text: string, lang: string, opts: { slow?: boolean; onEnd?: () => void } = {}) {
  if (!canSpeak() || !text) {
    opts.onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  const voices = voicesLoaded.length ? voicesLoaded : loadVoices();
  const exact = voices.find((v) => v.lang.toLowerCase() === lang.toLowerCase());
  const base = voices.find((v) => v.lang.toLowerCase().startsWith(lang.split("-")[0].toLowerCase()));
  const voice = exact ?? base;
  if (voice) u.voice = voice;
  u.rate = opts.slow ? 0.6 : 0.92;
  u.onend = () => opts.onEnd?.();
  u.onerror = () => opts.onEnd?.();
  window.speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if (canSpeak()) window.speechSynthesis.cancel();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Recognition = any;

export function canRecognize() {
  if (typeof window === "undefined") return false;
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

/** Starts speech recognition; resolves with the transcript. Call the returned stop() to end early. */
export function listen(
  lang: string,
  handlers: { onResult: (text: string, final: boolean) => void; onEnd: () => void; onError?: (e: string) => void },
): () => void {
  const w = window as any;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  if (!Ctor) {
    handlers.onError?.("Speech recognition isn't supported in this browser. Try Chrome or Edge.");
    handlers.onEnd();
    return () => {};
  }
  const rec: Recognition = new Ctor();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  rec.maxAlternatives = 1;
  rec.onresult = (e: any) => {
    let text = "";
    let final = false;
    for (let i = 0; i < e.results.length; i++) {
      text += e.results[i][0].transcript;
      if (e.results[i].isFinal) final = true;
    }
    handlers.onResult(text, final);
  };
  rec.onerror = (e: any) => handlers.onError?.(e.error === "not-allowed" ? "Microphone permission was denied." : `Couldn't hear you (${e.error}).`);
  rec.onend = () => handlers.onEnd();
  rec.start();
  return () => {
    try {
      rec.stop();
    } catch {
      /* already stopped */
    }
  };
}
