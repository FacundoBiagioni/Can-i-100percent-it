"use client";

import { VERDICT } from "@/lib/ui/verdict";
import { useT } from "@/lib/i18n/client";
import type { AnalysisStatus } from "@/lib/pipeline/types";

export default function StatusBadge({ status }: { status: AnalysisStatus }) {
  const t = useT();
  const v = VERDICT[status];
  const Icon = v.icon;
  return (
    <div className={`inline-flex items-center gap-3 border px-4 py-3 text-heading font-semibold ${v.border} ${v.text}`}>
      <Icon aria-hidden className="h-6 w-6 shrink-0" />
      <span>{t.verdict[status].label}</span>
    </div>
  );
}
