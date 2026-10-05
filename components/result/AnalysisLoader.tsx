"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "@/lib/pipeline/types";
import type { FlaggedAchievement } from "@/lib/db/queries/achievements";
import BottomSheet from "./BottomSheet";
import VerdictBlock from "./VerdictBlock";
import VerdictActions from "./VerdictActions";
import { recordRecentGame } from "@/lib/recentGames";

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 30; // 90s ceiling — first analysis is normally done in a few seconds

export default function AnalysisLoader({ appId, name, image }: { appId: number; name: string; image: string | null }) {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [achievements, setAchievements] = useState<FlaggedAchievement[]>([]);
  const [timedOut, setTimedOut] = useState(false);
  const attempts = useRef(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function poll() {
      if (cancelled) return;
      attempts.current += 1;

      try {
        const res = await fetch(`/api/games/${appId}/analysis`);
        if (res.status === 200) {
          const data = await res.json();
          if (!cancelled) {
            setAnalysis(data.analysis);
            setAchievements(data.achievements ?? []);
            recordRecentGame({ appId, name, image, status: data.analysis.status });
          }
          return;
        }
        // 202 (pending) or a transient error — keep polling up to the cap.
      } catch {
        // network hiccup — treated the same as "still pending", just retry.
      }

      if (attempts.current >= MAX_ATTEMPTS) {
        if (!cancelled) setTimedOut(true);
        return;
      }
      timer = setTimeout(poll, POLL_INTERVAL_MS);
    }

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [appId, name, image]);

  if (analysis) {
    return (
      <>
        <div className="flex flex-col gap-5">
          <VerdictBlock analysis={analysis} />
          <VerdictActions appId={appId} gameName={name} status={analysis.status} />
        </div>
        {analysis.status !== "no_achievements" && <BottomSheet analysis={analysis} achievements={achievements} />}
      </>
    );
  }

  if (timedOut) {
    return <p className="text-body text-ash">This is taking longer than expected. Reload the page to check again.</p>;
  }

  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="flex flex-col gap-3">
        <div className="h-14 w-64 animate-pulse bg-cinder" />
        <div className="h-4 w-28 animate-pulse bg-cinder" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 w-12 animate-pulse bg-cinder" />
        ))}
      </div>
      <p className="text-body text-ash" role="status">
        Analyzing this game for the first time...
      </p>
    </div>
  );
}
