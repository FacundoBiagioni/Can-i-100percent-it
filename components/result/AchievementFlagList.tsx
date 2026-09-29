import Accordion from "@/components/ui/Accordion";
import type { AnalysisResult } from "@/lib/pipeline/types";

export default function AchievementFlagList({ analysis }: { analysis: AnalysisResult }) {
  if (analysis.missableAchievementCount === 0 && analysis.buggedAchievementCount === 0) {
    return (
      <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5">
        <Accordion summary="No missable or bugged achievements reported">
          <p>No sources flagged missable steps or broken unlocks for this game.</p>
        </Accordion>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5">
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
  );
}
