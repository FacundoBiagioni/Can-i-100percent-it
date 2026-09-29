import Accordion from "@/components/ui/Accordion";
import type { AnalysisResult } from "@/lib/pipeline/types";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function RequirementsSummary({ analysis }: { analysis: AnalysisResult }) {
  const requiredDlc = analysis.dlcRequired.filter((d) => d.required);

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 px-5">
      <Accordion
        summary={
          requiredDlc.length > 0
            ? `${requiredDlc.length} DLC required — ${formatCents(analysis.totalDlcCostCents)}`
            : "No DLC required"
        }
      >
        {requiredDlc.length === 0 ? (
          <p>All achievements are obtainable with the base game.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {requiredDlc.map((d) => (
              <li key={d.dlcAppId} className="flex justify-between">
                <span>
                  {d.name}
                  {d.isDelisted && <span className="ml-2 text-red-400">(delisted)</span>}
                </span>
                {d.priceCents !== null && <span>{formatCents(d.priceCents)}</span>}
              </li>
            ))}
          </ul>
        )}
      </Accordion>

      <Accordion
        summary={
          analysis.multiplayerRequired
            ? `Multiplayer required — servers ${analysis.serversStatus}`
            : "No multiplayer requirement"
        }
      >
        {analysis.multiplayerRequired ? (
          <p>
            At least one achievement needs multiplayer/co-op.{" "}
            {analysis.serversStatus === "offline"
              ? "Current player activity suggests servers may no longer be reachable."
              : analysis.serversStatus === "online"
                ? "Current player activity suggests servers are still reachable."
                : "Server status could not be determined from available data."}
          </p>
        ) : (
          <p>Every achievement can be earned solo, offline.</p>
        )}
      </Accordion>

      {analysis.estimatedHours !== null && (
        <Accordion summary={`~${Math.round(analysis.estimatedHours)}h estimated to 100%`}>
          <p>Median time reported by players who reached 100% completion.</p>
        </Accordion>
      )}
    </div>
  );
}
