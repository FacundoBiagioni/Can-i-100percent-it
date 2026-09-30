import type { ConfidenceLevel } from "@/lib/pipeline/types";

const LABEL: Record<ConfidenceLevel, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

export default function ConfidencePill({ confidence }: { confidence: ConfidenceLevel }) {
  return (
    <span className="rounded-full border border-zinc-700 bg-black/50 px-3 py-1 text-xs font-medium text-zinc-300 backdrop-blur-sm">
      {LABEL[confidence]}
    </span>
  );
}
