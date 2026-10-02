import type { AnalysisResult } from "@/lib/pipeline/types";
import { formatPrice, PRICE_REGION_LABEL } from "@/lib/ui/price";

/** Direct, always-visible facts — no accordion, and a fact that has nothing
 * to disclose (no DLC required, no multiplayer requirement) renders nothing
 * at all rather than a "no X" placeholder line. */
export default function RequirementsSummary({ analysis }: { analysis: AnalysisResult }) {
  const requiredDlc = analysis.dlcRequired.filter((d) => d.required);

  return (
    <>
      {requiredDlc.length > 0 && (
        <div className="w-full border border-carbon p-4">
          <h2 className="mb-3 flex justify-between gap-4 text-nav text-graphite">
            <span>{requiredDlc.length} DLC required</span>
            <span className="tabular-nums text-chalk">{formatPrice(analysis.totalDlcCostCents)}</span>
          </h2>
          <table className="w-full text-left text-body">
            <tbody>
              {requiredDlc.map((d) => (
                <tr key={d.dlcAppId} className="border-t border-carbon">
                  <td className="py-2 pr-4 text-ash">
                    {d.name}
                    {d.isDelisted && <span className="ml-2 text-fail">(delisted)</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums text-graphite">
                    {d.priceCents !== null ? formatPrice(d.priceCents) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-caption text-graphite">{PRICE_REGION_LABEL}</p>
        </div>
      )}

      {analysis.multiplayerRequired && (
        <div className="flex w-full flex-col gap-2 border border-carbon p-4">
          <h2 className="text-nav text-graphite">Multiplayer required</h2>
          <p className="text-body text-ash">
            Servers <span className="text-chalk">{analysis.serversStatus}</span>.{" "}
            {analysis.serversStatus === "offline"
              ? "Current player activity suggests servers may no longer be reachable."
              : analysis.serversStatus === "online"
                ? "Current player activity suggests servers are still reachable."
                : "Server status could not be determined from available data."}
          </p>
        </div>
      )}

      {analysis.estimatedHours !== null && (
        <div className="flex w-full flex-col gap-2 border border-carbon p-4">
          <h2 className="text-nav text-graphite">Time to 100%</h2>
          <p className="text-body text-ash">
            <span className="text-heading font-semibold text-chalk">~{Math.round(analysis.estimatedHours)}h</span>{" "}
            median reported by players who reached full completion.
          </p>
        </div>
      )}
    </>
  );
}
