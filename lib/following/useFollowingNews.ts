"use client";

import { useEffect, useState } from "react";
import type { AnalysisStatus } from "@/lib/pipeline/types";
import type { GameTileData } from "@/components/home/GameTile";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { FollowedGame } from "./store";

type Live = { appId: number; name: string; image: string | null; status: AnalysisStatus | null; lowestCut: number | null };

/** What changed since the visitor last opened a followed game. */
export type FollowNews = { verdictWas: AnalysisStatus | null; lowestCut: number | null };

/**
 * Asks the server for the current state of the followed games (one request
 * per change of the list) and compares it with what the visitor last saw.
 * Until the answer lands, games show as stored.
 */
export function useFollowingNews(items: FollowedGame[] | null) {
  const [live, setLive] = useState<Map<number, Live> | null>(null);
  const ids = items?.map((g) => g.appId).join(",") ?? "";

  useEffect(() => {
    if (!ids) return;
    const controller = new AbortController();
    fetch("/api/following", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appIds: ids.split(",").map(Number) }),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { games: Live[] } | null) => data && setLive(new Map(data.games.map((g) => [g.appId, g]))))
      .catch(() => {});
    return () => controller.abort();
  }, [ids]);

  const news = new Map<number, FollowNews>();
  for (const g of items ?? []) {
    const now = live?.get(g.appId);
    if (!now) continue;
    // A first verdict (none before) isn't news; a different one is.
    const verdictWas = g.status && now.status && now.status !== g.status ? g.status : null;
    const lowestCut = now.lowestCut !== null && now.lowestCut !== g.seenCut ? now.lowestCut : null;
    if (verdictWas || lowestCut !== null) news.set(g.appId, { verdictWas, lowestCut });
  }
  return { live, news };
}

/** A followed game as a tile: live verdict, and its news as the detail line. */
export function followedTile(g: FollowedGame, live: Map<number, Live> | null, news: FollowNews | undefined, t: Dictionary): GameTileData {
  const now = live?.get(g.appId);
  const lines = [
    news?.verdictWas ? t.following.verdictChanged(t.verdict[news.verdictWas].label) : null,
    news?.lowestCut != null ? t.following.allTimeLow(news.lowestCut) : null,
  ].filter(Boolean);
  return {
    appId: g.appId,
    name: now?.name ?? g.name,
    image: now?.image ?? g.image,
    status: now?.status ?? g.status,
    detail: lines.length > 0 ? lines.join(" · ") : undefined,
    alert: lines.length > 0,
  };
}
