import { VERDICT } from "@/lib/ui/verdict";
import type { AnalysisStatus } from "@/lib/pipeline/types";

const ORDER: AnalysisStatus[] = ["green", "red", "yellow", "no_achievements"];

export default function VerdictLegend() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <p className="text-nav text-graphite">Verdicts</p>
        <h2 className="text-heading-lg font-semibold">Four possible answers.</h2>
        <p className="max-w-87.5 text-body text-ash">
          Each game gets checked against Steam data, community guides and player reports for DLC requirements,
          dead servers, and missable or bugged achievements.
        </p>
      </div>
      <dl className="grid grid-cols-1 border-l border-t border-carbon sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((status) => {
          const v = VERDICT[status];
          const Icon = v.icon;
          return (
            <div key={status} className="flex flex-col gap-3 border-b border-r border-carbon p-4">
              <dt className={`flex items-center gap-2 text-heading-sm font-semibold ${v.text}`}>
                <Icon aria-hidden className="h-5 w-5 shrink-0" />
                {v.label}
              </dt>
              <dd className="text-body text-ash">{v.blurb}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
