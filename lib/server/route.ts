import "server-only";
import { NextResponse } from "next/server";
import { currentUser } from "./auth";
import type { StoredUser } from "./db";
import type { Course } from "../types";

type Ctx = { user: StoredUser; course: Course };

/** Wraps an AI route: requires sign-in and an active course. */
export async function withCourse(handler: (ctx: Ctx) => Promise<Response>): Promise<Response> {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const course = user.activeCourse ? user.courses[user.activeCourse] : undefined;
  if (!course) return NextResponse.json({ error: "Start a course first." }, { status: 400 });
  return handler({ user, course });
}
