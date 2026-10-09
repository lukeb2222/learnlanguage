import { NextResponse } from "next/server";
import { aiErrorResponse, generate } from "@/lib/server/claude";
import { placementPrompt, placementSchema, systemPrompt } from "@/lib/server/ai";
import { currentUser, unauthorized } from "@/lib/server/auth";
import { LANGUAGES } from "@/lib/languages";

export const maxDuration = 300;

/** Generates a placement test before the course exists (during sign-up). */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return unauthorized();
  const b = await req.json().catch(() => ({}));
  const ids = new Set(LANGUAGES.map((l) => l.id));
  if (!ids.has(b.targetLanguage) || !ids.has(b.nativeLanguage)) {
    return NextResponse.json({ error: "Unknown language" }, { status: 400 });
  }
  try {
    const test = await generate({
      system: systemPrompt({
        name: user.displayName,
        ageGroup: String(b.ageGroup ?? ""),
        nativeLanguage: b.nativeLanguage,
        otherLanguages: [],
        targetLanguage: b.targetLanguage,
        level: "A1",
        goals: [],
        interests: [],
        learningStyles: [],
        challenges: [],
        correctionStyle: "balanced",
        motivation: "",
      }),
      messages: [{ role: "user", content: placementPrompt() }],
      schema: placementSchema,
      effort: "low",
    });
    return NextResponse.json(test);
  } catch (e) {
    return aiErrorResponse(e);
  }
}
