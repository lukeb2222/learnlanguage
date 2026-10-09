"use client";

import { Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LessonPlayer } from "@/components/LessonPlayer";
import { LoadingScreen } from "@/components/ui";
import { useUser } from "@/components/UserProvider";
import type { LessonMode } from "@/lib/types";

function LessonRoute() {
  const params = useSearchParams();
  const { user, loading } = useUser();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !user) router.replace("/");
  }, [loading, user, router]);
  const mode = (params.get("mode") ?? "lesson") as LessonMode;
  return (
    <LessonPlayer
      key={params.toString()}
      mode={mode}
      unitId={params.get("unit") ?? undefined}
      lessonId={params.get("lesson") ?? undefined}
      focus={params.get("focus") ?? undefined}
    />
  );
}

export default function LessonPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LessonRoute />
    </Suspense>
  );
}
