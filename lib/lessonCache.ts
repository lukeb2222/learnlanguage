"use client";

import { api } from "./client";
import type { Lesson } from "./types";

export interface LessonPayload {
  lesson: Lesson;
  reviewWords: string[];
}

const inflight = new Map<string, Promise<LessonPayload>>();

function storageKey(key: string) {
  return `lingora:lesson:${key}`;
}

/** Fetches a lesson, reusing a prefetched copy when available. */
export function getLesson(key: string, body: Record<string, unknown>, opts: { consume?: boolean } = {}): Promise<LessonPayload> {
  try {
    const cached = sessionStorage.getItem(storageKey(key));
    if (cached) {
      if (opts.consume) sessionStorage.removeItem(storageKey(key));
      return Promise.resolve(JSON.parse(cached) as LessonPayload);
    }
  } catch {
    /* storage unavailable */
  }
  const existing = inflight.get(key);
  if (existing) {
    if (opts.consume) inflight.delete(key);
    return existing;
  }
  const p = api<LessonPayload>("/api/ai/lesson", body).then((res) => {
    if (!opts.consume) {
      try {
        sessionStorage.setItem(storageKey(key), JSON.stringify(res));
      } catch {
        /* storage full */
      }
    }
    inflight.delete(key);
    return res;
  });
  p.catch(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}

/** Warms the cache for the learner's next lesson so it opens instantly. */
export function prefetchLesson(key: string, body: Record<string, unknown>) {
  try {
    if (sessionStorage.getItem(storageKey(key)) || inflight.has(key)) return;
  } catch {
    return;
  }
  getLesson(key, body).catch(() => {});
}
