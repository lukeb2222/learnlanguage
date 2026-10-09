"use client";

import { useEffect, useState } from "react";
import { OUTFITS } from "@/lib/game";
import type { Avatar as AvatarT } from "@/lib/types";

/** Glo, the app's mascot: a friendly glowing blob. */
export function Mascot({
  size = 120,
  mood = "happy",
  outfit,
  className = "",
}: {
  size?: number;
  mood?: "happy" | "sad" | "wow" | "think";
  outfit?: string;
  className?: string;
}) {
  const hat = outfit && outfit !== "none" ? OUTFITS.find((o) => o.id === outfit)?.icon : null;
  return (
    <div className={`relative inline-block ${className}`} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden>
        <defs>
          <radialGradient id="glo-body" cx="40%" cy="35%" r="70%">
            <stop offset="0%" stopColor="#b9a6ff" />
            <stop offset="60%" stopColor="#7c5cff" />
            <stop offset="100%" stopColor="#5230c9" />
          </radialGradient>
        </defs>
        <ellipse cx="60" cy="112" rx="30" ry="5" fill="#1e1b3a" opacity="0.08" />
        <path d="M60 14c26 0 44 20 44 48 0 26-18 44-44 44S16 88 16 62c0-28 18-48 44-48z" fill="url(#glo-body)" />
        <path d="M22 70c-8 2-12 8-10 14 6-2 10-6 12-10z" fill="#6540f0" />
        <path d="M98 70c8 2 12 8 10 14-6-2-10-6-12-10z" fill="#6540f0" />
        <ellipse cx="44" cy="34" rx="10" ry="6" fill="#fff" opacity="0.35" />
        {mood === "sad" ? (
          <>
            <path d="M38 58q6-5 12 0" stroke="#1e1b3a" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M70 58q6-5 12 0" stroke="#1e1b3a" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M48 84q12-8 24 0" stroke="#1e1b3a" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="45" cy="58" rx="8" ry={mood === "wow" ? 10 : 9} fill="#fff" />
            <ellipse cx="75" cy="58" rx="8" ry={mood === "wow" ? 10 : 9} fill="#fff" />
            <circle cx={mood === "think" ? 48 : 46} cy={mood === "think" ? 55 : 60} r="4.5" fill="#1e1b3a" />
            <circle cx={mood === "think" ? 78 : 76} cy={mood === "think" ? 55 : 60} r="4.5" fill="#1e1b3a" />
            {mood === "wow" ? (
              <ellipse cx="60" cy="84" rx="7" ry="8" fill="#1e1b3a" />
            ) : mood === "think" ? (
              <path d="M52 84h16" stroke="#1e1b3a" strokeWidth="4" strokeLinecap="round" />
            ) : (
              <path d="M46 78q14 14 28 0" stroke="#1e1b3a" strokeWidth="4.5" fill="#ff8a6b" strokeLinecap="round" />
            )}
          </>
        )}
        <circle cx="34" cy="72" r="5" fill="#ff8a6b" opacity="0.5" />
        <circle cx="86" cy="72" r="5" fill="#ff8a6b" opacity="0.5" />
      </svg>
      {hat && (
        <span className="absolute left-1/2 -translate-x-1/2" style={{ top: -size * 0.12, fontSize: size * 0.34 }}>
          {hat}
        </span>
      )}
    </div>
  );
}

export function Avatar({ avatar, size = 40 }: { avatar: AvatarT; size?: number }) {
  const hat = avatar.outfit && avatar.outfit !== "none" ? OUTFITS.find((o) => o.id === avatar.outfit)?.icon : null;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex h-full w-full items-center justify-center rounded-full"
        style={{ background: avatar.color, fontSize: size * 0.55 }}
      >
        {avatar.emoji}
      </div>
      {hat && (
        <span className="absolute -right-1 -top-2" style={{ fontSize: size * 0.4 }}>
          {hat}
        </span>
      )}
    </div>
  );
}

export function ProgressBar({ value, color = "#1fc47f", className = "", height = 16 }: { value: number; color?: string; className?: string; height?: number }) {
  return (
    <div className={`w-full overflow-hidden rounded-full bg-grape-100 ${className}`} style={{ height }}>
      <div
        className="relative h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.max(0, Math.min(100, value * 100))}%`, background: color }}
      >
        <div className="absolute left-2 right-2 top-1 h-1/4 rounded-full bg-white/30" />
      </div>
    </div>
  );
}

export function Modal({ open, onClose, children }: { open: boolean; onClose?: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center" onClick={onClose}>
      <div className="card max-h-[90vh] w-full max-w-md animate-pop overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

const TIPS = [
  "Spaced repetition: reviewing just before you'd forget makes memories stick for much longer.",
  "Saying words out loud — even quietly — helps you remember them better (the production effect).",
  "Getting about 85% right is the sweet spot for learning: challenging, but not discouraging.",
  "Mistakes are good! Errors followed by feedback strengthen learning more than easy successes.",
  "Short daily sessions beat long weekly ones — consistency builds habits.",
  "Learning phrases as whole chunks makes you sound more natural, faster.",
  "Understanding ~95% of what you hear is ideal for picking up new words from context.",
  "Mixing different kinds of practice (interleaving) feels harder but works better long-term.",
];

export function LoadingScreen({ title = "Your AI tutor is preparing your lesson…", mood }: { title?: string; mood?: "think" | "happy" }) {
  const [tip, setTip] = useState(() => Math.floor(Math.random() * TIPS.length));
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTip((x) => (x + 1) % TIPS.length), 6000);
    const d = setInterval(() => setDots((x) => (x + 1) % 4), 400);
    return () => {
      clearInterval(t);
      clearInterval(d);
    };
  }, []);
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 p-6 text-center">
      <Mascot size={140} mood={mood ?? "think"} className="animate-float" />
      <h2 className="text-2xl font-bold">
        {title.replace(/…$/, "")}
        <span className="inline-block w-8 text-left">{".".repeat(dots)}</span>
      </h2>
      <div className="card max-w-md p-5">
        <div className="mb-1 text-xs font-bold uppercase tracking-wider text-grape-500">💡 Did you know?</div>
        <p className="text-ink/80">{TIPS[tip]}</p>
      </div>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 p-8 text-center">
      <Mascot size={110} mood="sad" />
      <p className="max-w-md font-semibold text-ink/80">{message}</p>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span className={`inline-block h-5 w-5 animate-spin rounded-full border-[3px] border-current border-r-transparent ${className}`} />;
}
