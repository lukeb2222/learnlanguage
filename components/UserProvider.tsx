"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";
import { setSoundEnabled } from "@/lib/sound";
import type { Course, UserState } from "@/lib/types";

interface Ctx {
  user: UserState | null;
  loading: boolean;
  course: Course | null;
  setUser: (u: UserState | null) => void;
  refresh: () => Promise<void>;
  /** Sends a game action to the server and updates local state with the result. */
  action: <T extends Record<string, unknown> = Record<string, unknown>>(payload: Record<string, unknown>) => Promise<T & { user: UserState }>;
}

const UserContext = createContext<Ctx | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user } = await api<{ user: UserState | null }>("/api/me");
      setUser(user);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (user) setSoundEnabled(user.settings.sound);
  }, [user]);

  const action = useCallback(async <T extends Record<string, unknown>>(payload: Record<string, unknown>) => {
    const res = await api<T & { user: UserState }>("/api/action", payload);
    setUser(res.user);
    return res;
  }, []);

  const course = user?.activeCourse ? (user.courses[user.activeCourse] ?? null) : null;
  const value = useMemo(() => ({ user, loading, course, setUser, refresh, action }), [user, loading, course, refresh, action]);
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
