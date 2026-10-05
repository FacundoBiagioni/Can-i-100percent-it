import { CircleCheck, CircleX, CircleQuestionMark, CircleMinus, type LucideIcon } from "lucide-react";
import type { AnalysisStatus } from "@/lib/pipeline/types";

/** Single source for how a verdict looks everywhere it appears (game page
 * badge, recent/recommended tiles, the homepage legend). Its label and blurb
 * live in the i18n dictionaries (t.verdict[status]). Color is always paired
 * with an icon and a label, never used on its own. */
export const VERDICT: Record<AnalysisStatus, { icon: LucideIcon; text: string; border: string; bg: string; tint: string }> = {
  green: {
    icon: CircleCheck,
    text: "text-pass",
    border: "border-pass",
    bg: "bg-pass",
    tint: "from-pass/[0.09]",
  },
  red: {
    icon: CircleX,
    text: "text-fail",
    border: "border-fail",
    bg: "bg-fail",
    tint: "from-fail/[0.09]",
  },
  yellow: {
    icon: CircleQuestionMark,
    text: "text-unsure",
    border: "border-unsure",
    bg: "bg-unsure",
    tint: "from-unsure/[0.09]",
  },
  no_achievements: {
    icon: CircleMinus,
    text: "text-ash",
    border: "border-carbon",
    bg: "bg-ash",
    tint: "from-ash/[0.05]",
  },
};
