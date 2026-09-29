"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "@/lib/pipeline/types";
import type { FlaggedAchievement } from "@/lib/db/queries/achievements";
import StatusBadge from "./StatusBadge";
import ConfidencePill from "./ConfidencePill";
import StatusIconRow from "./StatusIconRow";
import RequirementsSummary from "./RequirementsSummary";
import AchievementsTable from "./AchievementsTable";

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 30; // 90s ceiling — first analysis is normally done in a few seconds

export default function AnalysisLoader({ appId }: { appId: number }) {
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
  }, [appId]);

  if (analysis) {
    return (
      <div className="flex w-full max-w-xl flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-3">
          <StatusBadge status={analysis.status} />
          <ConfidencePill confidence={analysis.confidence} />
        </div>
        <StatusIconRow analysis={analysis} />
        <RequirementsSummary analysis={analysis} />
        <AchievementsTable achievements={achievements} />
      </div>
    );
  }

  if (timedOut) {
    return <p className="text-sm text-zinc-400">This is taking longer than expected. Reload the page to check again.</p>;
  }

  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-6">
      <div className="flex flex-col items-center gap-3">
        <div className="h-14 w-56 animate-pulse rounded-2xl bg-zinc-800" />
        <div className="h-6 w-32 animate-pulse rounded-full bg-zinc-800" />
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 w-12 animate-pulse rounded-2xl bg-zinc-800" />
        ))}
      </div>
      <p className="text-sm text-zinc-400">Analyzing this game for the first time…</p>
      <div className="h-24 w-full animate-pulse rounded-2xl bg-zinc-800" />
    </div>
  );
}
