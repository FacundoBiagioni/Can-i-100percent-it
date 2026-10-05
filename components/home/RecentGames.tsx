"use client";

import { clearRecentGames, useRecentGames } from "@/lib/recentGames";
import GameTile, { GameTileSkeleton, type GameTileData } from "./GameTile";
import { useT } from "@/lib/i18n/client";

const GRID = "grid grid-cols-2 pl-px pt-px md:grid-cols-4";

/**
 * The visitor's own recently checked games, or, for a first visit (nothing
 * stored yet), a recommended set rendered on the server. Storage is only
 * readable after hydration, so the first paint is a skeleton of the same
 * size; this section sits below the fold, so that swap is never on screen.
 */
export default function RecentGames({ recommended }: { recommended: GameTileData[] }) {
  const t = useT();
  const recent = useRecentGames();
  const hasRecent = recent !== null && recent.length > 0;
  const games = recent === null ? null : hasRecent ? recent : recommended;

  if (games !== null && games.length === 0) return null;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="text-nav text-graphite">
            {recent === null ? " " : hasRecent ? (
              <>
                {t.home.recentlyChecked} <sup className="text-caption">{recent.length}</sup>
              </>
            ) : (
              t.home.recommended
            )}
          </p>
          <h2 className="text-heading-lg font-semibold">
            {hasRecent ? t.home.pickUp : t.home.notSure}
          </h2>
        </div>
        {hasRecent && (
          <button
            onClick={clearRecentGames}
            className="shrink-0 cursor-pointer border border-fog px-2 py-1 text-nav font-medium text-chalk transition-colors hover:bg-chalk hover:text-void"
          >
            {t.home.clear}
          </button>
        )}
      </div>

      <div className={GRID}>
        {games === null
          ? Array.from({ length: 4 }).map((_, i) => <GameTileSkeleton key={i} />)
          : games.map((g) => <GameTile key={g.appId} game={g} />)}
      </div>
    </div>
  );
}
