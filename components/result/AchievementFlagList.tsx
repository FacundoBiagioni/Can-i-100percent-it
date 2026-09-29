import Accordion from "@/components/ui/Accordion";
import AchievementDetailPanel from "./AchievementDetailPanel";
import type { AnalysisResult } from "@/lib/pipeline/types";

export default function AchievementFlagList({ appId, analysis }: { appId: number; analysis: AnalysisResult }) {
  const flaggedCount =
    analysis.missableAchievementCount + analysis.buggedAchievementCount + analysis.unobtainableAchievementCount;

  if (flaggedCount === 0) {
    return (
      <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5">
        <Accordion summary="No missable, bugged, or unobtainable achievements reported">
          <p>No sources flagged missable steps, broken unlocks, or permanently blocked achievements for this game.</p>
        </Accordion>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5">
        {analysis.unobtainableAchievementCount > 0 && (
          <Accordion summary={`${analysis.unobtainableAchievementCount} achievement(s) confirmed permanently unobtainable`}>
            <p>These require content or servers that are no longer available — see below for which and why.</p>
          </Accordion>
        )}
        {analysis.missableAchievementCount > 0 && (
          <Accordion summary={`${analysis.missableAchievementCount} missable achievement(s) reported`}>
            <p>These require specific choices earlier in a playthrough — check a guide before starting.</p>
          </Accordion>
        )}
        {analysis.buggedAchievementCount > 0 && (
          <Accordion summary={`${analysis.buggedAchievementCount} bugged achievement(s) reported`}>
            <p>Some players report these failing to unlock even when the requirement is met.</p>
          </Accordion>
        )}
      </div>
      <AchievementDetailPanel appId={appId} count={flaggedCount} />
    </div>
  );
}
