"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { unfollowGame, useFollowing } from "@/lib/following/store";
import { followedTile, useFollowingNews } from "@/lib/following/useFollowingNews";
import GameTile, { GameTileSkeleton } from "@/components/home/GameTile";
import { useT } from "@/lib/i18n/client";

const GRID = "grid grid-cols-2 pl-px pt-px md:grid-cols-4";
const HOME_LIMIT = 4;

/**
 * The games this browser follows, flagged ones first. "home" is the short
 * row above Recently checked (hidden when nothing is followed); "page" is
 * the full list on /following, each with an unfollow button.
 */
export default function FollowingGames({ variant }: { variant: "home" | "page" }) {
  const t = useT();
  const items = useFollowing();
  const { live, news } = useFollowingNews(items);

  if (items === null) {
    if (variant === "home") return null;
    return (
      <div className={GRID}>
        {Array.from({ length: 4 }).map((_, i) => (
          <GameTileSkeleton key={i} />
        ))}
      </div>
    );
  }
  if (items.length === 0) {
    return variant === "home" ? null : <p className="max-w-xl text-body text-graphite">{t.following.empty}</p>;
  }

  // Stable sort: flagged first, then the order they were followed in.
  const sorted = [...items].sort((a, b) => Number(news.has(b.appId)) - Number(news.has(a.appId)));
  const shown = variant === "home" ? sorted.slice(0, HOME_LIMIT) : sorted;
  const grid = (
    <ul className={GRID}>
      {shown.map((g) => (
        <li key={g.appId} className="relative flex [&>a]:flex-1">
          <GameTile game={followedTile(g, live, news.get(g.appId), t)} />
          {variant === "page" && (
            <button
              type="button"
              onClick={() => unfollowGame(g.appId)}
              aria-label={`${t.following.unfollow}: ${g.name}`}
              title={t.following.unfollow}
              className="absolute left-2 top-2 flex h-7 w-7 cursor-pointer items-center justify-center bg-void/80 text-ash backdrop-blur-sm transition-colors hover:text-chalk"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
  if (variant === "page") return grid;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="text-nav text-graphite">
            {t.following.label} <sup className="text-caption">{items.length}</sup>
            {news.size > 0 && <span className="ml-2 text-ember">{t.following.updates(news.size)}</span>}
          </p>
          <h2 className="text-heading-lg font-semibold">{t.following.homeTitle}</h2>
        </div>
        <Link
          href="/following"
          className="shrink-0 border border-fog px-2 py-1 text-nav font-medium text-chalk transition-colors hover:bg-chalk hover:text-void"
        >
          {t.following.seeAll}
        </Link>
      </div>
      {grid}
    </div>
  );
}
