/** Hosted-build replacement for lib/client.ts: `api()` calls the in-browser backend. */
import { handle } from "./backend";

export { normalizeAnswer, quickMatch, similarity } from "@/lib/answers";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T = unknown>(url: string, body?: unknown): Promise<T> {
  try {
    return (await handle(url, body as Record<string, unknown> | undefined)) as T;
  } catch (e) {
    const err = e as { message?: string; status?: number };
    throw new ApiError(err.message ?? "Something went wrong.", err.status ?? 500);
  }
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
