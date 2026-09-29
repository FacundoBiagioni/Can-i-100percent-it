import type { AnalysisResult } from "@/lib/pipeline/types";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

/** Direct, always-visible facts — no accordion, and a fact that has nothing
 * to disclose (no DLC required, no multiplayer requirement) renders nothing
 * at all rather than a "no X" placeholder line. */
export default function RequirementsSummary({ analysis }: { analysis: AnalysisResult }) {
  const requiredDlc = analysis.dlcRequired.filter((d) => d.required);

  return (
    <>
      {requiredDlc.length > 0 && (
        <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
          <h2 className="mb-3 text-sm font-semibold text-zinc-200">
            {requiredDlc.length} DLC required — {formatCents(analysis.totalDlcCostCents)}
          </h2>
          <table className="w-full text-left text-sm">
            <tbody>
              {requiredDlc.map((d) => (
                <tr key={d.dlcAppId} className="border-t border-zinc-800/60 first:border-t-0">
                  <td className="py-2 pr-4 text-zinc-300">
                    {d.name}
                    {d.isDelisted && <span className="ml-2 text-red-400">(delisted)</span>}
                  </td>
                  <td className="py-2 text-right text-zinc-400">
                    {d.priceCents !== null ? formatCents(d.priceCents) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {analysis.multiplayerRequired && (
        <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-300">
          <span className="font-semibold text-zinc-200">Multiplayer required</span> — servers{" "}
          {analysis.serversStatus}.{" "}
          {analysis.serversStatus === "offline"
            ? "Current player activity suggests servers may no longer be reachable."
            : analysis.serversStatus === "online"
              ? "Current player activity suggests servers are still reachable."
              : "Server status could not be determined from available data."}
        </div>
      )}

      {analysis.estimatedHours !== null && (
        <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 text-sm text-zinc-300">
          <span className="font-semibold text-zinc-200">~{Math.round(analysis.estimatedHours)}h</span> estimated to
          100% — median time reported by players who reached full completion.
        </div>
      )}
    </>
  );
}
