"use client";

let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(on: boolean) {
  enabled = on;
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.15) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, ctx.currentTime + start);
  g.gain.linearRampToValueAtTime(gain, ctx.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + dur + 0.05);
}

function play(fn: () => void) {
  if (!enabled || typeof window === "undefined") return;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    fn();
  } catch {
    /* audio unavailable */
  }
}

export const sfx = {
  correct: () => play(() => { tone(660, 0, 0.12, "triangle"); tone(990, 0.09, 0.2, "triangle"); }),
  wrong: () => play(() => { tone(220, 0, 0.18, "sawtooth", 0.08); tone(180, 0.12, 0.25, "sawtooth", 0.08); }),
  tap: () => play(() => tone(520, 0, 0.05, "sine", 0.08)),
  complete: () => play(() => { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * 0.1, 0.3, "triangle")); }),
  levelUp: () => play(() => { [392, 523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, i * 0.08, 0.25, "square", 0.06)); }),
};
