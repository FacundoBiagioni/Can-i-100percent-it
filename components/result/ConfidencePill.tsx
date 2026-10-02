import type { ConfidenceLevel } from "@/lib/pipeline/types";

const LABEL: Record<ConfidenceLevel, string> = { high: "High confidence", medium: "Medium confidence", low: "Low confidence" };

export default function ConfidencePill({ confidence }: { confidence: ConfidenceLevel }) {
  return <span className="text-nav text-ash">{LABEL[confidence]}</span>;
}
