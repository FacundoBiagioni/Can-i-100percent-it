import type { AnalysisStatus } from "@/lib/pipeline/types";

const STATUS_CONFIG: Record<AnalysisStatus, { emoji: string; label: string; className: string }> = {
  green: {
    emoji: "🟢",
    label: "100% obtainable",
    className: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  },
  red: {
    emoji: "🔴",
    label: "100% impossible",
    className: "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300",
  },
  yellow: {
    emoji: "🟡",
    label: "Insufficient info",
    className: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
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
