import { Package, PackageX, Server, ServerOff, Bug, BugOff, GitBranch, Clock, Ban, CircleOff } from "lucide-react";
import StatusIcon from "@/components/ui/StatusIcon";
import type { AnalysisResult } from "@/lib/pipeline/types";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function StatusIconRow({ analysis }: { analysis: AnalysisResult }) {
  const requiredDlc = analysis.dlcRequired.filter((d) => d.required);
  const delistedRequiredDlc = requiredDlc.filter((d) => d.isDelisted);

  const dlcState = delistedRequiredDlc.length > 0 ? "warning" : requiredDlc.length > 0 ? "on" : "off";
  const dlcLabel =
    delistedRequiredDlc.length > 0
      ? `Requires delisted DLC: ${delistedRequiredDlc.map((d) => d.name).join(", ")}`
      : requiredDlc.length > 0
        ? `Requires DLC — ${formatCents(analysis.totalDlcCostCents)}`
        : "No DLC required";

  const serversState = !analysis.multiplayerRequired
    ? "off"
    : analysis.serversStatus === "offline"
      ? "warning"
      : "on";
  const serversLabel = !analysis.multiplayerRequired
    ? "No multiplayer required"
    : analysis.serversStatus === "offline"
      ? "Multiplayer required — servers appear offline"
      : analysis.serversStatus === "online"
        ? "Multiplayer required — servers online"
        : "Multiplayer required — server status unknown";

  const missableState = analysis.missableAchievementCount > 0 ? "warning" : "off";
  const missableLabel =
    analysis.missableAchievementCount > 0
      ? `${analysis.missableAchievementCount} missable achievement(s) — check a guide before playing`
      : "No missable achievements reported";

  const buggedState = analysis.buggedAchievementCount > 0 ? "warning" : "off";
  const buggedLabel =
    analysis.buggedAchievementCount > 0
      ? `${analysis.buggedAchievementCount} bugged achievement(s) reported`
      : "No bugged achievements reported";

  // Red can come from delisted DLC or dead servers (both already have their
  // own icon above) or from the layer 2 unobtainable-content signal — which
  // otherwise has no dedicated icon of its own, so a red verdict driven
  // purely by that signal would show as five "off" icons and no visible
  // reason. This surfaces it, reusing the verdict's own reasoning text.
  const structuralBlock = analysis.status === "red" && delistedRequiredDlc.length === 0 && serversState !== "warning";

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <StatusIcon
        icon={dlcState === "warning" ? PackageX : Package}
        state={dlcState}
        label={dlcLabel}
        badge={requiredDlc.length > 0 ? requiredDlc.length : undefined}
      />
      <StatusIcon
        icon={serversState === "warning" ? ServerOff : Server}
        state={serversState}
        label={serversLabel}
      />
      <StatusIcon
        icon={GitBranch}
        state={missableState}
        label={missableLabel}
        badge={analysis.missableAchievementCount > 0 ? analysis.missableAchievementCount : undefined}
      />
      <StatusIcon
        icon={buggedState === "warning" ? Bug : BugOff}
        state={buggedState}
        label={buggedLabel}
        badge={analysis.buggedAchievementCount > 0 ? analysis.buggedAchievementCount : undefined}
      />
      <StatusIcon
        icon={structuralBlock ? Ban : CircleOff}
        state={structuralBlock ? "warning" : "off"}
        label={structuralBlock ? analysis.reasoning : "No confirmed permanent blockers found"}
      />
      {analysis.estimatedHours !== null && (
        <StatusIcon icon={Clock} state="on" label={`~${Math.round(analysis.estimatedHours)}h estimated to 100%`} />
      )}
    </div>
  );
}
