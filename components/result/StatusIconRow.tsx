"use client";

import { Package, PackageX, Server, ServerOff, Bug, BugOff, GitBranch, Clock, Ban, CircleOff } from "lucide-react";
import StatusIcon from "@/components/ui/StatusIcon";
import type { AnalysisResult } from "@/lib/pipeline/types";
import { useFormatPrice } from "@/lib/pricing/client";
import { useT } from "@/lib/i18n/client";
import { localizeReasoning } from "@/lib/i18n/reasoning";
import { useSpoilers } from "./SpoilerContext";

export default function StatusIconRow({ analysis }: { analysis: AnalysisResult }) {
  const t = useT();
  const formatPrice = useFormatPrice();
  const { mask } = useSpoilers();
  const requiredDlc = analysis.dlcRequired.filter((d) => d.required);
  const delistedRequiredDlc = requiredDlc.filter((d) => d.isDelisted);

  const dlcState = delistedRequiredDlc.length > 0 ? "warning" : requiredDlc.length > 0 ? "on" : "off";
  const dlcLabel =
    delistedRequiredDlc.length > 0
      ? delistedRequiredDlc.every((d) => d.unlisted)
        ? t.icons.dlcUnlisted
        : t.icons.dlcDelisted(delistedRequiredDlc.filter((d) => !d.unlisted).map((d) => d.name).join(", "))
      : requiredDlc.length > 0
        ? t.icons.dlcRequired(formatPrice(analysis.totalDlcCostCents))
        : t.icons.noDlc;

  const serversState = !analysis.multiplayerRequired
    ? "off"
    : analysis.serversStatus === "offline"
      ? "warning"
      : "on";
  const serversLabel = !analysis.multiplayerRequired
    ? t.icons.noMultiplayer
    : analysis.serversStatus === "offline"
      ? t.icons.serversOffline
      : analysis.serversStatus === "online"
        ? t.icons.serversOnline
        : t.icons.serversUnknown;

  // "caution", not "warning" — missable achievements don't block 100%, they
  // just need a second playthrough/save, so they shouldn't read as red like
  // an actual blocker does.
  const missableState = analysis.missableAchievementCount > 0 ? "caution" : "off";
  const missableLabel =
    analysis.missableAchievementCount > 0
      ? t.icons.missable(analysis.missableAchievementCount)
      : t.icons.noMissable;

  // "caution", not "warning": a bugged achievement is unreliable to unlock,
  // not impossible, so it must not read like the red blockers.
  const buggedState = analysis.buggedAchievementCount > 0 ? "caution" : "off";
  const buggedLabel =
    analysis.buggedAchievementCount > 0
      ? t.icons.bugged(analysis.buggedAchievementCount)
      : t.icons.noBugged;

  // Red can come from delisted DLC or dead servers (both already have their
  // own icon above) or from the layer 2 unobtainable-content signal — which
  // otherwise has no dedicated icon of its own, so a red verdict driven
  // purely by that signal would show as five "off" icons and no visible
  // reason. This surfaces it, reusing the verdict's own reasoning text.
  const structuralBlock = analysis.status === "red" && delistedRequiredDlc.length === 0 && serversState !== "warning";

  return (
    <div className="flex flex-wrap items-center gap-2">
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
        icon={buggedState === "caution" ? Bug : BugOff}
        state={buggedState}
        label={buggedLabel}
        badge={analysis.buggedAchievementCount > 0 ? analysis.buggedAchievementCount : undefined}
      />
      <StatusIcon
        icon={structuralBlock ? Ban : CircleOff}
        state={structuralBlock ? "warning" : "off"}
        label={structuralBlock ? mask(localizeReasoning(analysis.reasoning, t)) : t.icons.noBlockers}
        badge={structuralBlock && analysis.unobtainableAchievementCount > 0 ? analysis.unobtainableAchievementCount : undefined}
      />
      {analysis.estimatedHours !== null && (
        <StatusIcon icon={Clock} state="on" label={t.icons.hours(Math.round(analysis.estimatedHours).toLocaleString(t.numberLocale))} />
      )}
    </div>
  );
}
