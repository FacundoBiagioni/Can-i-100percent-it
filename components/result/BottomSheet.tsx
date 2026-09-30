"use client";

import { useState } from "react";
import { ChevronUp } from "lucide-react";
import type { AnalysisResult } from "@/lib/pipeline/types";
import type { FlaggedAchievement } from "@/lib/db/queries/achievements";
import RequirementsSummary from "./RequirementsSummary";
import AchievementsTable from "./AchievementsTable";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function buildPeekSummary(analysis: AnalysisResult, achievementCount: number): string | null {
  const requiredDlc = analysis.dlcRequired.filter((d) => d.required);
  const parts: string[] = [];
  if (requiredDlc.length > 0) parts.push(`${requiredDlc.length} DLC — ${formatCents(analysis.totalDlcCostCents)}`);
  if (analysis.multiplayerRequired) parts.push("multiplayer required");
  if (achievementCount > 0) parts.push(`${achievementCount} achievement${achievementCount === 1 ? "" : "s"} flagged`);
  if (analysis.estimatedHours !== null) parts.push(`~${Math.round(analysis.estimatedHours)}h to 100%`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Sits fixed over the full-bleed hero background, collapsed to a small peek
 * (just the summary line) by default so the hero — game name, verdict,
 * icons — is the first and only thing seen on entry. Tapping the peek slides
 * it up, covering the background, to reveal the full DLC/achievement detail.
 * Renders nothing at all if there's genuinely nothing to disclose.
 */
export default function BottomSheet({
  analysis,
  achievements,
}: {
  analysis: AnalysisResult;
  achievements: FlaggedAchievement[];
}) {
  const [expanded, setExpanded] = useState(false);
  const summary = buildPeekSummary(analysis, achievements.length);
  if (!summary) return null;

  return (
    <div
      className={`fixed bottom-0 left-6 z-30 flex h-[min(70vh,42rem)] w-[min(24rem,calc(100vw-3rem))] flex-col rounded-t-3xl border-t border-zinc-800 bg-black/90 shadow-2xl backdrop-blur-md transition-transform duration-300 ease-out ${
        expanded ? "translate-y-0" : "translate-y-[calc(100%-5.5rem)]"
      }`}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex h-[5.5rem] shrink-0 flex-col items-center justify-center gap-2 px-6"
        aria-expanded={expanded}
      >
        <span className="h-1 w-10 rounded-full bg-zinc-600" />
        <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-200">
          {summary}
          <ChevronUp className={`h-4 w-4 text-zinc-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>
      <div className="flex-1 overflow-y-auto px-6 pb-8">
        <div className="flex flex-col gap-3">
          <RequirementsSummary analysis={analysis} />
          <AchievementsTable achievements={achievements} />
        </div>
      </div>
    </div>
  );
}
