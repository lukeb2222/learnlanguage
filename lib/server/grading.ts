import "server-only";
import { generate } from "./claude";
import { gradeSchema, systemPrompt } from "./ai";
import type { SessionRecord } from "./db";
import { NO_SPACE_LANGS, normalizeAnswer, quickMatch, similarity } from "../answers";
import type { Exercise, LearnerProfile, LessonMode, LessonResult, Mistake, Story, VocabItem } from "../types";

export interface LessonSessionPayload {
  mode: LessonMode;
  unitId?: string;
  lessonId?: string;
  exercises: Exercise[];
  reviewWords: string[];
}

export interface StorySessionPayload {
  unitId?: string;
  story: Story;
}

export interface Verdict {
  correct: boolean;
  note: string;
  correctAnswer: string;
  explanation: string;
}

/** Exercise types whose answers the server can check itself. */
export const SERVER_GRADED = ["multiple_choice", "fill_blank", "listen_choice", "translate_build", "translate_type", "listen_type"];
/** Types checked in the browser (pairing UI / speech recognition) and self-reported. */
export const CLIENT_GRADED = ["match_pairs", "speak"];

export const isGraded = (e: Exercise) => e.type !== "teach";

/** What the browser receives: answer keys removed from server-graded exercises. */
export function redactExercise(e: Exercise): Exercise {
  if (!SERVER_GRADED.includes(e.type)) return e;
  return { ...e, correctAnswer: "", acceptedAnswers: [], explanation: "" };
}

export function redactStory(story: Story): Story {
  return { ...story, segments: story.segments.map((s) => (s.kind === "question" ? { ...s, answer: "" } : s)) };
}

/** Authoritative grading of one answer. Falls back to Claude for free-text translations. */
export async function gradeExercise(ex: Exercise, answer: string, languageId: string, profile: LearnerProfile, userId: string): Promise<Verdict> {
  const accepted = [ex.correctAnswer, ...ex.acceptedAnswers];
  const base = { correctAnswer: ex.correctAnswer, explanation: ex.explanation };
  switch (ex.type) {
    case "multiple_choice":
    case "fill_blank":
    case "listen_choice":
      return { ...base, correct: normalizeAnswer(answer) === normalizeAnswer(ex.correctAnswer), note: "" };
    case "listen_type": {
      const sim = Math.max(...accepted.map((a) => similarity(answer, a)));
      if (sim >= 0.97) return { ...base, correct: true, note: "" };
      if (sim >= 0.85) return { ...base, correct: true, note: `Almost perfect! Exact answer: ${ex.correctAnswer}` };
      return { ...base, correct: false, note: "" };
    }
    case "translate_build":
    case "translate_type": {
      const noSpace = ex.answerLanguage === "target" && NO_SPACE_LANGS.includes(languageId);
      const given = ex.type === "translate_build" && noSpace ? answer.replace(/\s+/g, "") : answer;
      const m = quickMatch(given, accepted);
      if (m === "exact") return { ...base, correct: true, note: "" };
      if (m === "typo") return { ...base, correct: true, note: `Watch the spelling: ${ex.correctAnswer}` };
      if (!given.trim()) return { ...base, correct: false, note: "" };
      const g = await generate({
        userId,
        system: systemPrompt(profile),
        messages: [
          {
            role: "user",
            content: `Grade this answer. Accept any answer that is a correct, natural translation with the same meaning, even if worded differently from the reference. Ignore capitalisation and punctuation. Mark "almost" for a single small typo or missing accent (still count it correct). Feedback: one short sentence in the learner's native language.
Task: ${ex.instruction}
Prompt: ${ex.prompt}
Reference answer: ${ex.correctAnswer}
Other accepted answers: ${ex.acceptedAnswers.join(" | ")}
Learner's answer: ${given.slice(0, 500)}`,
          },
        ],
        schema: gradeSchema,
        effort: "low",
        maxTokens: 2000,
      });
      const alt = g.correct && g.bestAnswer && normalizeAnswer(g.bestAnswer) !== normalizeAnswer(given) ? ` · Another way: ${g.bestAnswer}` : "";
      return { ...base, correct: g.correct, note: g.feedback + alt };
    }
    default:
      return { ...base, correct: true, note: "" };
  }
}

const LIVES = 3;

/**
 * Builds the lesson result from what the server itself recorded, so XP,
 * vocabulary and league standings can't be forged by the browser.
 */
export function lessonResultFromSession(
  s: SessionRecord<LessonSessionPayload>,
  client: { maxCombo: number; durationSec: number },
  now: number,
): LessonResult {
  const { mode, unitId, lessonId, exercises, reviewWords } = s.payload;
  const graded = exercises.map((e, i) => ({ e, i })).filter(({ e }) => isGraded(e));
  const answered = graded.filter(({ i }) => s.results[i] !== undefined);
  const correct = graded.filter(({ i }) => s.results[i]?.correct).length;
  const wrong = answered.length - correct;
  const total = graded.length;

  let passed = answered.length === total;
  if (mode === "legendary" || mode === "test_out") passed = passed && wrong < LIVES;
  if (mode === "test_out") passed = passed && total > 0 && correct / total >= 0.8;

  const mistakes: Mistake[] = graded
    .filter(({ i }) => s.results[i] && !s.results[i].correct)
    .map(({ e, i }) => ({ prompt: e.prompt || e.audioText, expected: e.correctAnswer, given: s.results[i].given, at: new Date(now).toISOString() }));

  const reviewed: { word: string; correct: boolean }[] = [];
  for (const w of reviewWords) {
    const lw = w.toLowerCase();
    const hits = graded.filter(({ e, i }) => s.results[i] && `${e.prompt} ${e.correctAnswer} ${e.audioText} ${e.pairs.map((p) => p.left).join(" ")}`.toLowerCase().includes(lw));
    if (hits.length) reviewed.push({ word: w, correct: hits.every(({ i }) => s.results[i].correct) });
  }

  const newVocab: VocabItem[] = passed ? exercises.filter((e) => e.type === "teach").flatMap((e) => e.newVocab) : [];
  const elapsed = Math.round((now - s.createdAt) / 1000);
  return {
    mode,
    unitId,
    lessonId,
    correct,
    total,
    maxCombo: Math.min(Math.max(0, Math.round(client.maxCombo) || 0), correct),
    durationSec: Math.min(Math.max(0, Math.round(client.durationSec) || 0), elapsed, 3600),
    newVocab,
    reviewed,
    mistakes,
    passed,
  };
}

export function storyResultFromSession(s: SessionRecord<StorySessionPayload>, client: { durationSec: number }, now: number): LessonResult {
  const qs = s.payload.story.segments.map((seg, i) => ({ seg, i })).filter(({ seg }) => seg.kind === "question");
  const correct = qs.filter(({ i }) => s.results[i]?.correct).length;
  const elapsed = Math.round((now - s.createdAt) / 1000);
  return {
    mode: "story",
    unitId: s.payload.unitId,
    correct,
    total: qs.length,
    maxCombo: 0,
    durationSec: Math.min(Math.max(0, Math.round(client.durationSec) || 0), elapsed, 3600),
    newVocab: [],
    reviewed: [],
    mistakes: [],
    passed: qs.every(({ i }) => s.results[i] !== undefined),
  };
}
