"use client";

import { useSyncExternalStore } from "react";
import type { AnalysisStatus } from "@/lib/pipeline/types";
import { MAX_FOLLOWED } from "./config";

/** A followed game, as the visitor last saw it. Lives only in this browser. */
export type FollowedGame = {
  appId: number;
  name: string;
  image: string | null;
  /** The verdict when the visitor last opened the game. */
  status: AnalysisStatus | null;
  /** The all-time-low discount already seen, so the same sale alerts once. */
  seenCut: number | null;
  followedAt: number;
};

const STORAGE_KEY = "following";
// Same-tab writes don't fire "storage" (that only reaches other tabs).
const CHANGE_EVENT = "following-change";

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null): FollowedGame[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? (value as FollowedGame[]) : [];
  } catch {
    return [];
  }
}

function write(items: FollowedGame[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Storage blocked (private mode, quota): following just doesn't stick.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/** Newest first; the oldest drops off past MAX_FOLLOWED. */
export function followGame(game: Omit<FollowedGame, "followedAt">) {
  const items = parse(readRaw()).filter((g) => g.appId !== game.appId);
  write([{ ...game, followedAt: Date.now() }, ...items].slice(0, MAX_FOLLOWED));
}

export function unfollowGame(appId: number) {
  write(parse(readRaw()).filter((g) => g.appId !== appId));
}

/** Opening a followed game counts as seeing its news: the current verdict and
 * sale become the new baseline. A null status never erases a known one. */
export function markFollowedSeen(appId: number, status: AnalysisStatus | null, cut: number | null) {
  const items = parse(readRaw());
  const game = items.find((g) => g.appId === appId);
  if (!game) return;
  const nextStatus = status ?? game.status;
  if (game.status === nextStatus && game.seenCut === cut) return;
  write(items.map((g) => (g.appId === appId ? { ...g, status: nextStatus, seenCut: cut } : g)));
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

// useSyncExternalStore needs a stable snapshot: cache the parse per raw string.
let cachedRaw: string | null | undefined;
let cachedItems: FollowedGame[] = [];
function getSnapshot(): FollowedGame[] {
  const raw = readRaw();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedItems = parse(raw);
  }
  return cachedItems;
}

/** null on the server and during hydration, the followed games afterwards. */
export function useFollowing(): FollowedGame[] | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
