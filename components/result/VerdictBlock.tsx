import type { AnalysisResult } from "@/lib/pipeline/types";
import StatusBadge from "./StatusBadge";
import ConfidencePill from "./ConfidencePill";
import StatusIconRow from "./StatusIconRow";

/** Badge + confidence + signal icons. Shared by the server-rendered page
 * (cached analysis) and AnalysisLoader (first-time run). */
export default function VerdictBlock({ analysis }: { analysis: AnalysisResult }) {
  if (analysis.status === "no_achievements") return <StatusBadge status={analysis.status} />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <StatusBadge status={analysis.status} />
        <ConfidencePill confidence={analysis.confidence} />
      </div>
      <StatusIconRow analysis={analysis} />
    </div>
  );
}
