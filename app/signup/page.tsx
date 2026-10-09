"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/components/UserProvider";
import { Mascot, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import type { UserState } from "@/lib/types";

export default function Signup() {
  const { setUser } = useUser();
  const router = useRouter();
  const [form, setForm] = useState({ displayName: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const { user } = await api<{ user: UserState }>("/api/auth/signup", { ...form, timezone });
      setUser(user);
      router.push("/welcome");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grape-50 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
        <div className="flex flex-col items-center text-center">
          <Mascot size={90} mood="wow" />
          <h1 className="mt-2 text-3xl font-bold">Create your profile</h1>
          <p className="text-sm text-ink/60">Free forever. Next, we'll ask a few questions so your AI tutor knows how to teach you.</p>
        </div>
        <input className="input" placeholder="Your name" value={form.displayName} onChange={set("displayName")} autoComplete="name" />
        <input className="input" placeholder="Username" value={form.username} onChange={set("username")} autoComplete="username" />
        <input className="input" type="email" placeholder="Email" value={form.email} onChange={set("email")} autoComplete="email" />
        <input className="input" type="password" placeholder="Password (8+ characters)" value={form.password} onChange={set("password")} autoComplete="new-password" />
        {error && <p className="text-sm font-semibold text-coral-600">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? <Spinner /> : "Create account"}
        </button>
        <p className="text-center text-sm text-ink/60">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-grape-500">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}
