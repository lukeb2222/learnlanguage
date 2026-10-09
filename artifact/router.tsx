import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * In-memory router used by the hosted (artifact) build. Artifact pages can't
 * rely on the URL, so routes live in React state with a small history stack.
 */
interface RouterState {
  href: string;
  push: (href: string) => void;
  replace: (href: string) => void;
  back: () => void;
}

const RouterContext = createContext<RouterState | null>(null);

export function RouterProvider({ initial, children }: { initial: string; children: React.ReactNode }) {
  const [stack, setStack] = useState<string[]>([initial]);
  const href = stack[stack.length - 1];
  const go = useCallback((next: string, mode: "push" | "replace") => {
    if (!next || next === "#") return;
    setStack((s) => (mode === "push" ? [...s, next].slice(-50) : [...s.slice(0, -1), next]));
    if (typeof window !== "undefined") window.scrollTo(0, 0);
  }, []);
  const value = useMemo<RouterState>(
    () => ({
      href,
      push: (h) => go(h, "push"),
      replace: (h) => go(h, "replace"),
      back: () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s)),
    }),
    [href, go],
  );
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouterState(): RouterState {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error("RouterProvider missing");
  return ctx;
}

export function splitHref(href: string): { path: string; query: string } {
  const [path, query = ""] = href.split("?");
  return { path: path || "/", query };
}
