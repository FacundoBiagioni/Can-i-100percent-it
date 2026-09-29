import type { LucideIcon } from "lucide-react";
import Tooltip from "./Tooltip";

export type IconState = "off" | "on" | "warning";

const TILE_STYLES: Record<IconState, string> = {
  off: "border-zinc-800 bg-zinc-900 text-zinc-700",
  on: "border-indigo-900 bg-indigo-950 text-indigo-400",
  warning: "border-red-900 bg-red-950 text-red-400",
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
        className={`relative inline-flex h-12 w-12 items-center justify-center rounded-2xl border transition-colors ${TILE_STYLES[state]}`}
      >
        <Icon className="h-5 w-5" strokeWidth={2} />
        {badge !== undefined && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-black">
            {badge}
          </span>
        )}
      </span>
    </Tooltip>
  );
}
