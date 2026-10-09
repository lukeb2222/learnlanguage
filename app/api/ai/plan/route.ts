import { NextResponse } from "next/server";
import { aiErrorResponse, generate } from "@/lib/server/claude";
import { planPrompt, planSchema, systemPrompt } from "@/lib/server/ai";
import { save, toClient } from "@/lib/server/db";
import { withCourse } from "@/lib/server/route";
import type { PlanUnit } from "@/lib/types";

export const maxDuration = 300;

/** Generates the personalised course path, or extends it with more units. */
export async function POST(req: Request) {
  const { extend } = await req.json().catch(() => ({}));
  return withCourse(async ({ user, course }) => {
    if (course.plan && !extend) return NextResponse.json({ user: toClient(user) });
    try {
      const existing = extend ? course.plan?.units : undefined;
      const plan = await generate({
        system: systemPrompt(course.profile),
        messages: [{ role: "user", content: planPrompt(course.profile, existing) }],
        schema: planSchema,
        effort: "medium",
      });
      const offset = existing?.length ?? 0;
      const units: PlanUnit[] = plan.units.map((u, i) => ({
        ...u,
        id: `u${offset + i + 1}`,
        lessons: u.lessons.map((l, j) => ({ ...l, id: `l${j + 1}` })),
      }));
      course.plan =
        extend && course.plan
          ? { ...course.plan, units: [...course.plan.units, ...units] }
          : { summary: plan.summary, approach: plan.approach, units };
      save();
      return NextResponse.json({ user: toClient(user) });
    } catch (e) {
      return aiErrorResponse(e);
    }
  });
}
