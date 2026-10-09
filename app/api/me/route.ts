import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { toClient } from "@/lib/server/db";

export async function GET() {
  const user = await currentUser();
  return NextResponse.json({ user: user ? toClient(user) : null });
}
