import { NextResponse } from "next/server";
import { aiErrorResponse, generate } from "@/lib/server/claude";
import { lettersSchema, systemPrompt } from "@/lib/server/ai";
import { withCourse } from "@/lib/server/route";
import { cacheGet, cacheSet } from "@/lib/server/db";
import { getLanguage } from "@/lib/languages";

export const maxDuration = 300;

/** Alphabet / character chart for the target script, shared between learners with the same language pair. */
export async function POST() {
  return withCourse(async ({ user, course }) => {
    const key = `letters:${course.profile.targetLanguage}:${course.profile.nativeLanguage}`;
    const cached = cacheGet(key);
    if (cached) return NextResponse.json(cached);
    const target = getLanguage(course.profile.targetLanguage);
    try {
      const chart = await generate({
        userId: user.id,
        system: systemPrompt(course.profile),
        messages: [
          {
            role: "user",
            content: `Create a characters chart for learning the ${target.script} writing system of ${target.name}. intro: 2 sentences on how the script works. Group the characters sensibly (e.g. vowels/consonants, hiragana rows, or for Chinese/Japanese kanji the 40 most frequent beginner characters in groups of ~10). Up to 8 groups, max 15 characters per group. For each give romanization, a sound description, and a common example word with its meaning.`,
          },
        ],
        schema: lettersSchema,
        effort: "low",
        maxTokens: 32000,
      });
      cacheSet(key, chart);
      return NextResponse.json(chart);
    } catch (e) {
      return aiErrorResponse(e);
    }
  });
}
