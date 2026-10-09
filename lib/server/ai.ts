import "server-only";
import { z } from "zod";
import { getLanguage } from "../languages";
import { PEDAGOGY_PROMPT } from "../pedagogy";
import type { Course, LearnerProfile, LessonMode, PlanLesson, PlanUnit } from "../types";

// ---------- schemas ----------

const vocab = z.object({ word: z.string(), translation: z.string(), romanization: z.string() });

export const planSchema = z.object({
  summary: z.string().describe("2-3 sentences, addressed to the learner, explaining how this course is tailored to them"),
  approach: z.array(z.string()).describe("4-6 short bullet points: the teaching strategies chosen for this learner and why"),
  units: z.array(
    z.object({
      title: z.string(),
      emoji: z.string().describe("one emoji"),
      cefr: z.string().describe("CEFR level of the unit, e.g. A1"),
      description: z.string(),
      canDo: z.string().describe("CEFR-style can-do statement, starting with 'I can'"),
      lessons: z.array(
        z.object({
          title: z.string(),
          focus: z.string().describe("the communicative focus + key grammar / vocabulary of the lesson"),
          objectives: z.array(z.string()),
        }),
      ),
    }),
  ),
});

export const exerciseSchema = z.object({
  type: z.enum([
    "teach",
    "multiple_choice",
    "translate_build",
    "translate_type",
    "listen_type",
    "listen_choice",
    "match_pairs",
    "fill_blank",
    "speak",
  ]),
  instruction: z.string(),
  prompt: z.string(),
  promptRomanization: z.string(),
  answerLanguage: z.enum(["target", "native"]),
  options: z.array(z.string()),
  correctAnswer: z.string(),
  acceptedAnswers: z.array(z.string()),
  wordBank: z.array(z.string()),
  pairs: z.array(z.object({ left: z.string(), right: z.string() })),
  audioText: z.string(),
  hint: z.string(),
  explanation: z.string(),
  newVocab: z.array(vocab),
});

export const lessonSchema = z.object({
  title: z.string(),
  intro: z.string().describe("one encouraging sentence about what this lesson teaches, in the learner's native language"),
  culturalNote: z.string().describe("a short, interesting cultural or usage note related to the lesson"),
  exercises: z.array(exerciseSchema),
});

export const gradeSchema = z.object({
  correct: z.boolean(),
  almost: z.boolean().describe("true if correct apart from a small typo or accent mark"),
  feedback: z.string(),
  bestAnswer: z.string(),
});

export const explainSchema = z.object({
  explanation: z.string(),
  examples: z.array(z.object({ sentence: z.string(), romanization: z.string(), translation: z.string() })),
  tip: z.string(),
});

export const chatSchema = z.object({
  reply: z.string().describe("your reply in the target language"),
  replyRomanization: z.string(),
  translation: z.string().describe("translation of your reply into the learner's native language"),
  corrections: z.array(z.object({ original: z.string(), corrected: z.string(), note: z.string() })),
  suggestions: z.array(z.string()).describe("2-3 short possible replies the learner could send next, in the target language"),
});

export const storySchema = z.object({
  title: z.string(),
  emoji: z.string(),
  setting: z.string().describe("one sentence in the learner's native language setting the scene"),
  segments: z.array(
    z.object({
      kind: z.enum(["line", "question"]),
      speaker: z.string(),
      text: z.string(),
      romanization: z.string(),
      translation: z.string(),
      question: z.string(),
      options: z.array(z.string()),
      answer: z.string(),
    }),
  ),
});

export const guidebookSchema = z.object({
  overview: z.string(),
  keyPhrases: z.array(z.object({ phrase: z.string(), translation: z.string(), romanization: z.string(), note: z.string() })),
  tips: z.array(z.object({ title: z.string(), body: z.string() })),
});

export const placementSchema = z.object({
  questions: z.array(
    z.object({
      cefr: z.enum(["A1", "A2", "B1", "B2", "C1"]),
      question: z.string().describe("instruction in the learner's native language"),
      prompt: z.string().describe("the sentence or text in the target language (or native language for translation items)"),
      options: z.array(z.string()),
      answer: z.string(),
    }),
  ),
});

export const lettersSchema = z.object({
  intro: z.string(),
  groups: z.array(
    z.object({
      title: z.string(),
      characters: z.array(
        z.object({
          char: z.string(),
          romanization: z.string(),
          sound: z.string().describe("how it sounds, explained for a speaker of the learner's native language"),
          example: z.string(),
          exampleMeaning: z.string(),
        }),
      ),
    }),
  ),
});

export const scenarioSchema = z.object({
  scenarios: z.array(z.object({ title: z.string(), emoji: z.string(), role: z.string(), goal: z.string(), opening: z.string() })),
});

// ---------- prompts ----------

export function learnerContext(p: LearnerProfile): string {
  const target = getLanguage(p.targetLanguage);
  const native = getLanguage(p.nativeLanguage);
  const others = p.otherLanguages.map((id) => getLanguage(id).name).join(", ") || "none";
  return `LEARNER PROFILE
- Name: ${p.name || "the learner"} (age group: ${p.ageGroup || "unknown"})
- Learning: ${target.name} (${target.native}); script: ${target.script}${target.rtl ? " (right-to-left)" : ""}
- Native language: ${native.name}. Write all instructions, explanations and translations in ${native.name}.
- Other languages known: ${others} (use them for positive transfer / cognates when helpful)
- Current level: ${p.level}
- Goals: ${p.goals.join(", ") || "general"}
- Interests: ${p.interests.join(", ") || "general"}
- Preferred learning styles: ${p.learningStyles.join(", ") || "mixed"}
- Self-reported challenges: ${p.challenges.join(", ") || "none given"}
- Correction preference: ${p.correctionStyle}
- In their own words: "${p.motivation || "—"}"
${target.romanize ? `- Always provide romanization (${target.script.includes("Pinyin") ? "Pinyin with tone marks" : target.script.includes("Jyutping") ? "Jyutping" : "a standard romanization"}) for target-language text in the romanization fields.` : "- Romanization fields should be empty strings (the target language uses the Latin script)."}`;
}

export function systemPrompt(p: LearnerProfile) {
  return `${PEDAGOGY_PROMPT}\n\n${learnerContext(p)}`;
}

export function planPrompt(p: LearnerProfile, existing?: PlanUnit[]) {
  if (existing?.length) {
    return `The learner has completed the following units:\n${existing
      .map((u) => `- ${u.cefr} ${u.title}: ${u.canDo}`)
      .join("\n")}\n\nDesign the NEXT 6 units continuing naturally from there (spiral back to earlier material, increase CEFR level gradually). Each unit must have 5 lessons. Return them in "units"; summary and approach should describe this next stage.`;
  }
  return `Design a personalised course for this learner: 8 units, each with exactly 5 lessons, starting at their current level (${p.level}).
- Unit 1 must be achievable and motivating on day one${p.level === "pre-A1" ? " (absolute beginner: greetings, the sound system / script basics, the very most frequent words)" : ""}.
- Order content by frequency and usefulness, weaving in the learner's goals and interests early.
- Each lesson's "focus" should name concrete vocabulary/chunks and at most one grammar point.
- Make titles short and fun (2-5 words).`;
}

const MODE_GUIDE: Record<LessonMode, string> = {
  lesson: "A regular lesson: introduce 3-5 new words/chunks with 'teach' steps, then practise them, recycling earlier material.",
  legendary:
    "LEGENDARY challenge: the hardest version of this unit. No 'teach' steps. Mostly production (translate_type, translate_build, listen_type, speak, fill_blank) with longer sentences that combine the whole unit.",
  unit_review: "Unit review: no new words. Mix every lesson of the unit with interleaved recognition and production items.",
  test_out:
    "Jump-ahead test: assess whether the learner already masters this unit AND all earlier units. No 'teach' steps, mostly production, increasing difficulty.",
  practice: "Personalised practice: review the learner's weak words and recent mistakes. No 'teach' steps.",
  mistakes: "Mistakes review: build exercises that directly target the listed mistakes so the learner can fix them. No 'teach' steps.",
  words: "Vocabulary review: practise exactly the listed due words using varied exercise types. No 'teach' steps.",
  listening: "Listening practice: only listen_choice and listen_type exercises plus a match_pairs, using known material.",
  speaking: "Speaking practice: mostly 'speak' exercises with short, useful sentences, plus a few translate_build.",
  letters: "Writing-system lesson: teach and practise individual characters / letters and simple words that use them.",
};

export function lessonPrompt(args: {
  course: Course;
  mode: LessonMode;
  unit?: PlanUnit;
  lesson?: PlanLesson;
  dueWords: string[];
  knownWords: string[];
  mistakes: string[];
  speaking: boolean;
  listening: boolean;
  focus?: string;
}) {
  const { course, mode, unit, lesson } = args;
  const count = mode === "legendary" || mode === "test_out" ? 16 : mode === "lesson" ? 14 : 12;
  const exclude = [
    !args.speaking && "speak",
    !args.listening && "listen_type, listen_choice",
  ].filter(Boolean);
  return `Create a ${mode.replace("_", " ")} with exactly ${count} exercises.
${MODE_GUIDE[mode]}
${unit ? `Unit: ${unit.title} (${unit.cefr}) — ${unit.description}. Can-do goal: ${unit.canDo}` : ""}
${lesson ? `Lesson: ${lesson.title} — focus: ${lesson.focus}. Objectives: ${lesson.objectives.join("; ")}` : ""}
${args.focus ? `Special focus: ${args.focus}` : ""}
Words the learner already knows (reuse them freely): ${args.knownWords.slice(-120).join(", ") || "none yet"}
Words due for spaced review (weave several in): ${args.dueWords.join(", ") || "none"}
Recent mistakes to recycle: ${args.mistakes.join(" | ") || "none"}
${exclude.length ? `Do NOT use these exercise types: ${exclude.join(", ")}.` : ""}

EXERCISE FORMAT RULES (every field must be present; use "" or [] when not applicable):
- teach: present ONE new word or chunk. prompt = the target-language item, correctAnswer = its meaning, explanation = a short usage note, newVocab = [that item]. audioText = the item.
- multiple_choice: prompt = a question or sentence; options = 3-4 choices; correctAnswer = one of the options exactly.
- translate_build: prompt = sentence to translate; correctAnswer = the translation; wordBank = the words of correctAnswer (tokenised as they'd be written${"; for languages without spaces split into natural word units"}) shuffled with 3-4 distractors; answerLanguage says which language the answer is in.
- translate_type: like translate_build but typed; acceptedAnswers = other valid translations.
- listen_type: audioText = target-language sentence spoken aloud; correctAnswer = audioText exactly; prompt = "".
- listen_choice: audioText = a target-language word/sentence; options = 3-4 written target-language choices; correctAnswer = the one that matches.
- match_pairs: pairs = 4-5 {left: target-language word, right: native-language meaning}.
- fill_blank: prompt = target-language sentence with "___" for the gap; options = 3-4 choices; correctAnswer = the missing word.
- speak: prompt = a short target-language sentence to read aloud; correctAnswer = same sentence; audioText = same sentence.
- Every exercise: instruction (short, in native language), hint (a nudge without giving the answer), explanation (why the answer is right, 1-2 sentences, native language). promptRomanization = romanization of the prompt when the prompt is in the target language. audioText should be set for any target-language prompt so it can be read aloud.
- newVocab lists new words introduced by that exercise (usually only on teach steps).
- Vary the exercise types and interleave them.`;
}

export function placementPrompt() {
  return `Create a 12-question placement test to estimate the learner's CEFR level in the target language: 2 questions at A1, 3 at A2, 3 at B1, 2 at B2, 2 at C1, ordered from easiest to hardest. Mix vocabulary, grammar, reading comprehension and translation items. Each question has 4 options and "answer" equals one option exactly.`;
}
