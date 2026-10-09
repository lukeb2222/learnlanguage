/** Answer matching shared by the browser (instant feedback) and the server (authoritative grading). */

export function normalizeAnswer(s: string): string {
  return s
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[.,!?¡¿;:"“”«»„'’`。、，！？：；「」『』()\-–—…·]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

export function similarity(a: string, b: string): number {
  const x = normalizeAnswer(a);
  const y = normalizeAnswer(b);
  if (!x && !y) return 1;
  return 1 - levenshtein(x, y) / Math.max(x.length, y.length);
}

/** Returns "exact", "typo" (accent or one-character slip), or "no". */
export function quickMatch(answer: string, accepted: string[]): "exact" | "typo" | "no" {
  const a = normalizeAnswer(answer);
  if (!a) return "no";
  for (const acc of accepted) {
    const b = normalizeAnswer(acc);
    if (!b) continue;
    if (a === b || a.replace(/ /g, "") === b.replace(/ /g, "")) return "exact";
  }
  for (const acc of accepted) {
    const b = normalizeAnswer(acc);
    if (!b) continue;
    if (stripAccents(a) === stripAccents(b)) return "typo";
    if (b.length > 6 && levenshtein(a, b) <= 1) return "typo";
  }
  return "no";
}

/** Languages written without spaces between words. */
export const NO_SPACE_LANGS = ["zh", "yue", "ja", "th"];
