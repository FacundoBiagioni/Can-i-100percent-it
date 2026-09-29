import type { AnalysisStatus } from "@/lib/pipeline/types";

const STATUS_CONFIG: Record<AnalysisStatus, { emoji: string; label: string; className: string }> = {
  green: {
    emoji: "🟢",
    label: "100% obtainable",
    className: "bg-emerald-950 text-emerald-300 ring-1 ring-inset ring-emerald-800",
  },
  red: {
    emoji: "🔴",
    label: "100% impossible",
    className: "bg-red-950 text-red-300 ring-1 ring-inset ring-red-800",
  },
  yellow: {
    emoji: "🟡",
    label: "Insufficient info",
    className: "bg-amber-950 text-amber-300 ring-1 ring-inset ring-amber-800",
  },
};

export default function StatusBadge({ status }: { status: AnalysisStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-6 py-4 text-xl font-semibold ${config.className}`}>
      <span aria-hidden>{config.emoji}</span>
      <span>{config.label}</span>
    </div>
  );
}
