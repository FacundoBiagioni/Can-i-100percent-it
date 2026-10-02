import { CircleCheck, CircleX, CircleQuestionMark, CircleMinus, type LucideIcon } from "lucide-react";
import type { AnalysisStatus } from "@/lib/pipeline/types";

/** Single source for how a verdict looks and reads everywhere it appears
 * (game page badge, recent/recommended tiles, the homepage legend). Color
 * is always paired with an icon and a label, never used on its own. */
export const VERDICT: Record<AnalysisStatus, { label: string; icon: LucideIcon; text: string; border: string; blurb: string }> = {
  green: {
    label: "100% obtainable",
    icon: CircleCheck,
    text: "text-pass",
    border: "border-pass",
    blurb: "Every achievement can still be earned today.",
  },
  red: {
    label: "100% impossible",
    icon: CircleX,
    text: "text-fail",
    border: "border-fail",
    blurb: "At least one achievement is permanently out of reach: delisted DLC, dead servers or removed content.",
  },
  yellow: {
    label: "Insufficient info",
    icon: CircleQuestionMark,
    text: "text-unsure",
    border: "border-unsure",
    blurb: "Not enough evidence either way. Treat it as unconfirmed.",
  },
  no_achievements: {
    label: "No achievements",
    icon: CircleMinus,
    text: "text-ash",
    border: "border-carbon",
    blurb: "This game has no Steam achievements to chase.",
  },
};
