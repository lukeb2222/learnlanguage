import { useMemo } from "react";
import { splitHref, useRouterState } from "../router";

export function useRouter() {
  const r = useRouterState();
  return useMemo(() => ({ push: r.push, replace: r.replace, back: r.back, refresh: () => {}, prefetch: () => {} }), [r]);
}

export function usePathname() {
  return splitHref(useRouterState().href).path;
}

export function useSearchParams() {
  const { query } = splitHref(useRouterState().href);
  return useMemo(() => new URLSearchParams(query), [query]);
}
