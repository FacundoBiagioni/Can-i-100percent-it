"use client";

import { useSyncExternalStore } from "react";
import type { AnalysisStatus } from "@/lib/pipeline/types";

export type RecentGame = {
  appId: number;
  name: string;
  image: string | null;
  status: AnalysisStatus | null;
};

const STORAGE_KEY = "recent-games";
const MAX_ITEMS = 8;
// Same-tab writes don't fire the native "storage" event (that one only
// reaches *other* tabs), so writes also dispatch this to notify subscribers.
const CHANGE_EVENT = "recent-games-change";

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): RecentGame[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as RecentGame[]) : [];
  } catch {
    return [];
  }
}

function write(items: RecentGame[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage blocked (private mode, quota) — recents are a convenience, so
    // silently skip rather than break the page.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Moves the game to the front (adding it if new). A null status never
 * overwrites a known one, so revisiting before the analysis loads doesn't
 * erase the verdict recorded last time. */
export function recordRecentGame(game: RecentGame) {
  const items = parse(readRaw());
  const previous = items.find((g) => g.appId === game.appId);
  const next = [
    { ...game, status: game.status ?? previous?.status ?? null },
    ...items.filter((g) => g.appId !== game.appId),
  ].slice(0, MAX_ITEMS);
  write(next);
}

export function clearRecentGames() {
  write([]);
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

// useSyncExternalStore needs a referentially stable snapshot, so the parsed
// array is cached against the raw string it came from.
let cachedRaw: string | null | undefined;
let cachedItems: RecentGame[] = [];
function getSnapshot(): RecentGame[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = parse(raw);
  }
  return cachedItems;
}

/** null on the server and during hydration (storage isn't readable there),
 * the stored list afterwards. */
export function useRecentGames(): RecentGame[] | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
