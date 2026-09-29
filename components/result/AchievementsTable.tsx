import { GitBranch, Bug, Ban } from "lucide-react";
import type { FlaggedAchievement } from "@/lib/db/queries/achievements";

const FLAG_CONFIG = {
  missable: { icon: GitBranch, label: "Missable", className: "bg-amber-950 text-amber-300" },
  bugged: { icon: Bug, label: "Bugged", className: "bg-red-950 text-red-300" },
  unobtainable: { icon: Ban, label: "Unobtainable", className: "bg-red-950 text-red-300" },
};

/** Direct, always-visible listing — no accordion, no click-to-load. Renders
 * nothing at all when there's nothing flagged, rather than a "none found"
 * placeholder. */
export default function AchievementsTable({ achievements }: { achievements: FlaggedAchievement[] }) {
  if (achievements.length === 0) return null;

  return (
    <div className="flex w-full flex-col gap-2">
      <h2 className="px-1 text-sm font-semibold text-zinc-200">
        {achievements.length} achievement{achievements.length === 1 ? "" : "s"} to know about
      </h2>
      {achievements.map((a) => (
        <div key={a.id} className="flex gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
          {a.iconUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={a.iconUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg" />
          )}
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-zinc-100">{a.displayName}</span>
              {a.flags.map((flag) => {
                const config = FLAG_CONFIG[flag];
                const Icon = config.icon;
                return (
                  <span
                    key={flag}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${config.className}`}
                  >
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </span>
                );
              })}
            </div>
            {a.description && <p className="text-xs text-zinc-500">{a.description}</p>}
            {a.reasons.map((r, i) => (
              <p key={i} className="text-xs text-zinc-400">
                <span className="text-zinc-500">{r.sourceName}:</span> {r.reasoning}
              </p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
