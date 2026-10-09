"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { useUser } from "@/components/UserProvider";
import { api } from "@/lib/client";
import { getLanguage } from "@/lib/languages";
import { DAILY_GOALS } from "@/lib/profileOptions";
import type { Settings } from "@/lib/types";

export default function SettingsPage() {
  return (
    <AppShell>
      <SettingsView />
    </AppShell>
  );
}

function Toggle({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div>
        <div className="font-bold">{label}</div>
        <div className="text-sm text-ink/60">{desc}</div>
      </div>
      <button className={`h-8 w-14 shrink-0 rounded-full p-1 transition ${value ? "bg-mint-500" : "bg-grape-100"}`} onClick={() => onChange(!value)} aria-label={label}>
        <span className={`block h-6 w-6 rounded-full bg-white transition ${value ? "translate-x-6" : ""}`} />
      </button>
    </div>
  );
}

function SettingsView() {
  const { user, action, setUser } = useUser();
  const router = useRouter();
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  if (!user) return null;
  const set = (s: Partial<Settings>) => action({ type: "settings", settings: s });

  return (
    <div className="space-y-6 py-6">
      <h1 className="text-3xl font-bold">Settings</h1>

      <section>
        <h2 className="mb-2 text-lg font-bold text-ink/60">Lessons</h2>
        <div className="card divide-y-2 divide-grape-100">
          <Toggle label="Sound effects" desc="Dings, buzzes and fanfares" value={user.settings.sound} onChange={(v) => set({ sound: v })} />
          <Toggle label="Listening exercises" desc="Audio challenges and auto-play" value={user.settings.listening} onChange={(v) => set({ listening: v })} />
          <Toggle label="Speaking exercises" desc="Speech-recognition challenges" value={user.settings.speaking} onChange={(v) => set({ speaking: v })} />
          <Toggle label="Romanization" desc="Show pronunciation for non-Latin scripts" value={user.settings.romanization} onChange={(v) => set({ romanization: v })} />
          <Toggle label="Unlimited hearts" desc="Free for everyone — mistakes never block you" value={user.settings.unlimitedHearts} onChange={(v) => set({ unlimitedHearts: v })} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-ink/60">Daily goal</h2>
        <div className="grid grid-cols-5 gap-2">
          {DAILY_GOALS.map((d) => (
            <button key={d.minutes} className={`chip text-center ${user.settings.dailyMinutes === d.minutes ? "chip-on" : ""}`} onClick={() => set({ dailyMinutes: d.minutes })}>
              <div className="text-2xl">{d.icon}</div>
              <div className="text-sm">{d.minutes}m</div>
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-ink/60">Courses</h2>
        <div className="card divide-y-2 divide-grape-100">
          {Object.values(user.courses).map((c) => {
            const l = getLanguage(c.languageId);
            const active = user.activeCourse === c.languageId;
            return (
              <div key={c.languageId} className="flex items-center gap-3 p-4">
                <span className="text-3xl">{l.flag}</span>
                <div className="flex-1">
                  <div className="font-bold">{l.name}</div>
                  <div className="text-sm text-ink/50">
                    {c.xp} XP · {c.completedLessons.length} lessons · from {getLanguage(c.profile.nativeLanguage).name}
                  </div>
                </div>
                {active ? (
                  <span className="text-sm font-bold text-mint-600">Active</span>
                ) : (
                  <button className="btn btn-ghost px-3 py-1.5 text-xs" onClick={() => action({ type: "switchCourse", courseId: c.languageId }).then(() => router.push("/learn"))}>
                    Switch
                  </button>
                )}
                {Object.keys(user.courses).length > 1 && (
                  <button
                    className="text-sm font-semibold text-coral-500"
                    onClick={() => {
                      if (confirmRemove === c.languageId) {
                        setConfirmRemove(null);
                        void action({ type: "deleteCourse", courseId: c.languageId });
                      } else setConfirmRemove(c.languageId);
                    }}
                    onBlur={() => setConfirmRemove(null)}
                  >
                    {confirmRemove === c.languageId ? "Tap again to remove" : "Remove"}
                  </button>
                )}
              </div>
            );
          })}
          <Link href="/welcome?add=1" className="flex items-center gap-3 p-4 font-bold text-grape-500 hover:bg-grape-50">
            <span className="text-3xl">➕</span> Add a new language
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold text-ink/60">More</h2>
        <div className="card divide-y-2 divide-grape-100">
          <Link href="/words" className="block p-4 font-bold hover:bg-grape-50">📒 My words</Link>
          <Link href="/research" className="block p-4 font-bold hover:bg-grape-50">🔬 The research behind Lingora</Link>
          <div className="p-4 text-sm text-ink/60">
            Signed in as {user.email} · Time zone {user.settings.timezone}
            <button className="ml-2 font-bold text-grape-500" onClick={() => set({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone })}>
              Update time zone
            </button>
          </div>
        </div>
      </section>

      <button
        className="btn btn-ghost w-full text-coral-500"
        onClick={async () => {
          await api("/api/auth/logout", {});
          setUser(null);
          router.push("/");
        }}
      >
        Sign out
      </button>
    </div>
  );
}
