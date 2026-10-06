"use client";

import Image from "next/image";
import { useState } from "react";
import { GitBranch, Bug, Ban, Hourglass, Eye } from "lucide-react";
import type { FlaggedAchievement } from "@/lib/db/queries/achievements";
import { useT } from "@/lib/i18n/client";
import { localizeClaimReason } from "@/lib/i18n/reasoning";
import { usePreferences } from "@/lib/preferences/client";

const FLAG_CONFIG = {
  missable: { icon: GitBranch, className: "border-unsure text-unsure" },
  bugged: { icon: Bug, className: "border-fail text-fail" },
  unobtainable: { icon: Ban, className: "border-fail text-fail" },
  upcoming: { icon: Hourglass, className: "border-fail text-fail" },
};

function AchievementRow({ a }: { a: FlaggedAchievement }) {
  const t = useT();
  const { hideSpoilers } = usePreferences();
  const [revealed, setRevealed] = useState(false);
  // Hidden achievements (Steam's own flag) stay covered when the visitor
  // asked to avoid spoilers: the tags still say why it matters, the name,
  // description and source notes wait for a tap.
  const covered = hideSpoilers && a.hidden && !revealed;

  return (
    <div className="flex gap-3 border-b border-r border-carbon p-4">
      {a.iconUrl && (
        <Image
          src={a.iconUrl}
          alt=""
          width={40}
          height={40}
          className={`h-10 w-10 shrink-0 transition-[filter] duration-300 ${covered ? "blur-md" : ""}`}
        />
      )}
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-body font-medium ${covered ? "text-ash" : "text-chalk"}`}>
            {covered ? t.achievements.hiddenTitle : a.displayName}
          </span>
          {a.flags.map((flag) => {
            const config = FLAG_CONFIG[flag];
            const Icon = config.icon;
            return (
              <span key={flag} className={`inline-flex items-center gap-1 border px-1.5 py-px text-caption ${config.className}`}>
                <Icon aria-hidden className="h-3 w-3" />
                {t.achievements[flag]}
              </span>
            );
          })}
        </div>
        {covered ? (
          <button
            type="button"
            onClick={() => setRevealed(true)}
            className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-caption text-graphite transition-colors hover:text-chalk"
          >
            <Eye aria-hidden className="h-3.5 w-3.5" />
            {t.achievements.reveal}
          </button>
        ) : (
          <>
            {a.description && <p className="text-caption text-graphite">{a.description}</p>}
            {a.reasons.map((r, i) => (
              <p key={i} className="text-caption text-ash">
                <span className="text-graphite">{r.sourceName}:</span> {r.reasoning && localizeClaimReason(r.reasoning, t)}
              </p>
            ))}
          </>
        )}
      </div>
    </div>
  );
}

/** Direct, always-visible listing — no accordion, no click-to-load. Renders
 * nothing at all when there's nothing flagged, rather than a "none found"
 * placeholder. */
export default function AchievementsTable({ achievements }: { achievements: FlaggedAchievement[] }) {
  const t = useT();
  if (achievements.length === 0) return null;

  return (
    <div className="flex w-full flex-col">
      <h2 className="mb-3 text-nav text-graphite">{t.achievements.toKnow(achievements.length)}</h2>
      <div className="border-l border-t border-carbon">
        {achievements.map((a) => (
          <AchievementRow key={a.id} a={a} />
        ))}
      </div>
    </div>
  );
}
