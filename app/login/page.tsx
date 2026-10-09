"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useUser } from "@/components/UserProvider";
import { Mascot, Spinner } from "@/components/ui";
import { api } from "@/lib/client";
import type { UserState } from "@/lib/types";

export default function Login() {
  const { setUser } = useUser();
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { user } = await api<{ user: UserState }>("/api/auth/login", { login, password });
      setUser(user);
      router.push("/learn");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-grape-50 p-4">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-8">
        <div className="flex flex-col items-center">
          <Mascot size={90} />
          <h1 className="mt-2 text-3xl font-bold">Welcome back!</h1>
        </div>
        <input className="input" placeholder="Email or username" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="username" />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        {error && <p className="text-sm font-semibold text-coral-600">{error}</p>}
        <button className="btn btn-primary w-full" disabled={busy || !login || !password}>
          {busy ? <Spinner /> : "Log in"}
        </button>
        <p className="text-center text-sm text-ink/60">
          New here?{" "}
          <Link href="/signup" className="font-bold text-grape-500">
            Create a free account
          </Link>
        </p>
      </form>
    </div>
  );
}
