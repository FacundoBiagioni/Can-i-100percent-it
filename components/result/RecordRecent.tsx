"use client";

import { useEffect } from "react";
import { recordRecentGame, type RecentGame } from "@/lib/recentGames";

/** Adds the game being viewed to the visitor's "Recently checked" list. */
export default function RecordRecent({ appId, name, image, status }: RecentGame) {
  useEffect(() => {
    recordRecentGame({ appId, name, image, status });
  }, [appId, name, image, status]);
  return null;
}
