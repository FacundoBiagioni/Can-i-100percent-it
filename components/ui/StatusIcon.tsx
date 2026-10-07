import type { LucideIcon } from "lucide-react";
import Tooltip from "./Tooltip";

export type IconState = "off" | "on" | "warning" | "caution";

const TILE_STYLES: Record<IconState, string> = {
  off: "border-carbon text-smudge",
  on: "border-fog text-chalk",
  // Distinct from "warning" (red) on purpose — this marks something to be
  // aware of that does NOT block reaching 100% (e.g. a missable achievement
  // recoverable on a new playthrough), so it must not read as a blocker.
  caution: "border-unsure text-unsure",
  warning: "border-fail text-fail",
};

const BADGE_STYLES: Record<IconState, string> = {
  off: "bg-carbon text-chalk",
  on: "bg-chalk text-void",
  caution: "bg-unsure text-void",
  warning: "bg-fail text-void",
};

export default function StatusIcon({
  icon: Icon,
  state,
  label,
  badge,
}: {
  icon: LucideIcon;
  state: IconState;
  label: string;
  badge?: string | number;
}) {
  return (
    <Tooltip label={label}>
      <span
        tabIndex={0}
        role="img"
        aria-label={label}
        className={`relative inline-flex h-12 w-12 items-center justify-center border bg-void transition-colors ${TILE_STYLES[state]}`}
      >
        <Icon aria-hidden className="h-5 w-5" strokeWidth={1.75} />
        {badge !== undefined && (
          <span
            className={`absolute -right-px -top-px flex h-4 min-w-4 items-center justify-center px-1 text-[11px] font-semibold tabular-nums ${BADGE_STYLES[state]}`}
          >
            {badge}
          </span>
        )}
      </span>
    </Tooltip>
  );
}
