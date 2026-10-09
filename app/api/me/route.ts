import { NextResponse } from "next/server";
import { currentUser } from "@/lib/server/auth";
import { save, toClient } from "@/lib/server/db";

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ user: null });
  save();
  return NextResponse.json({ user: toClient(user) });
}
