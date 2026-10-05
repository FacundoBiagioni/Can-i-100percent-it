import type { AnalysisResult } from "@/lib/pipeline/types";
import { formatPrice, PRICE_REGION_LABEL } from "@/lib/ui/price";

/** Direct, always-visible facts — no accordion, and a fact that has nothing
 * to disclose (no DLC required) renders nothing at all rather than a "no X"
 * placeholder line. Multiplayer isn't repeated here: the server icon and
 * its tooltip already cover it. */
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
                  <td className="py-2 pr-4 align-top text-ash">
                    {d.name}
                    {d.isDelisted && <span className="ml-2 text-fail">(delisted)</span>}
                    {d.evidence && d.evidence.length > 0 && (
                      <span className="mt-0.5 block text-caption text-graphite">Needed for: {d.evidence.join(", ")}</span>
                    )}
                  </td>
                  <td className="py-2 text-right align-top tabular-nums text-graphite">
                    {d.priceCents === null ? "Not sold alone" : d.priceCents === 0 ? "Free" : formatPrice(d.priceCents)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-caption text-graphite">{PRICE_REGION_LABEL}</p>
        </div>
      )}

      {analysis.estimatedHours !== null && (
        <div className="flex w-full flex-col gap-2 border border-carbon p-4">
          <h2 className="text-nav text-graphite">Time to 100%</h2>
          <p className="text-body text-ash">
            <span className="text-heading font-semibold text-chalk">~{Math.round(analysis.estimatedHours)}h</span>{" "}
            median time players took to unlock every achievement.
          </p>
        </div>
      )}
    </>
  );
}
