"use client";

import Image from "next/image";
import { GitBranch, Bug, Ban } from "lucide-react";
import type { FlaggedAchievement } from "@/lib/db/queries/achievements";
import { useT } from "@/lib/i18n/client";

const FLAG_CONFIG = {
  missable: { icon: GitBranch, className: "border-unsure text-unsure" },
  bugged: { icon: Bug, className: "border-fail text-fail" },
  unobtainable: { icon: Ban, className: "border-fail text-fail" },
};

/** Direct, always-visible listing — no accordion, no click-to-load. Renders
 * nothing at all when there's nothing flagged, rather than a "none found"
 * placeholder. */
export default function AchievementsTable({ achievements }: { achievements: FlaggedAchievement[] }) {
  const t = useT();
  if (achievements.length === 0) return null;

  return (
    <div className="flex w-full flex-col">
      <h2 className="mb-3 text-nav text-graphite">
        {t.achievements.toKnow(achievements.length)}
      </h2>
      <div className="border-l border-t border-carbon">
        {achievements.map((a) => (
          <div key={a.id} className="flex gap-3 border-b border-r border-carbon p-4">
            {a.iconUrl && <Image src={a.iconUrl} alt="" width={40} height={40} className="h-10 w-10 shrink-0" />}
            <div className="flex min-w-0 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-body font-medium text-chalk">{a.displayName}</span>
                {a.flags.map((flag) => {
                  const config = FLAG_CONFIG[flag];
                  const Icon = config.icon;
                  return (
                    <span
                      key={flag}
                      className={`inline-flex items-center gap-1 border px-1.5 py-px text-caption ${config.className}`}
                    >
                      <Icon aria-hidden className="h-3 w-3" />
                      {t.achievements[flag]}
                    </span>
                  );
                })}
              </div>
              {a.description && <p className="text-caption text-graphite">{a.description}</p>}
              {a.reasons.map((r, i) => (
                <p key={i} className="text-caption text-ash">
                  <span className="text-graphite">{r.sourceName}:</span> {r.reasoning}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
