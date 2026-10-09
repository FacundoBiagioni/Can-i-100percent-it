"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, BellRing, X } from "lucide-react";
import type { AnalysisStatus } from "@/lib/pipeline/types";
import { followGame, markFollowedSeen, unfollowGame, useFollowing } from "@/lib/following/store";
import { useT } from "@/lib/i18n/client";

type Props = {
  appId: number;
  name: string;
  image: string | null;
  status: AnalysisStatus | null;
  /** The discount when the game is at its all-time low right now, else null. */
  lowestCut: number | null;
  className: string;
};

const NOTE_MS = 8000;

/** Follow / unfollow a game. While it's followed, opening its page marks its
 * current verdict and sale as seen, which clears its flag in Following.
 * Following shows a short note saying what it does; it closes by itself, on
 * Escape, or on a tap outside. */
export default function FollowButton({ appId, name, image, status, lowestCut, className }: Props) {
  const t = useT();
  const following = useFollowing();
  const followed = following?.some((g) => g.appId === appId) ?? false;
  const [noteOpen, setNoteOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!noteOpen) return;
    const timer = setTimeout(() => setNoteOpen(false), NOTE_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setNoteOpen(false);
    const onDown = (e: PointerEvent) => !wrapRef.current?.contains(e.target as Node) && setNoteOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [noteOpen]);

  function toggle() {
    if (followed) {
      unfollowGame(appId);
      setNoteOpen(false);
    } else {
      followGame({ appId, name, image, status, seenCut: lowestCut });
      setNoteOpen(true);
    }
  }

  useEffect(() => {
    if (followed) markFollowedSeen(appId, status, lowestCut);
  }, [followed, appId, status, lowestCut]);

  // Storage isn't readable before hydration; keep the slot so nothing shifts.
  if (following === null) return <span aria-hidden className={`${className} invisible`}><Bell className="h-3.5 w-3.5" />{t.following.follow}</span>;

  return (
    <span ref={wrapRef} className="relative inline-flex">
      <button
        type="button"
        aria-pressed={followed}
        onClick={toggle}
        className={`${className} ${followed ? "border-fog text-chalk" : ""}`}
        title={followed ? t.following.unfollow : undefined}
      >
        {followed ? <BellRing aria-hidden className="h-3.5 w-3.5" /> : <Bell aria-hidden className="h-3.5 w-3.5" />}
        {followed ? t.following.followingNow : t.following.follow}
      </button>
      <span role="status" aria-live="polite" className="sr-only">
        {noteOpen ? t.following.noteBody : ""}
      </span>
      {noteOpen && (
        <span className="absolute bottom-full left-0 z-30 mb-2 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-2 border border-fog bg-void p-3 text-left shadow-lg">
          <span className="flex items-start justify-between gap-3">
            <span className="flex items-center gap-1.5 text-nav font-semibold text-chalk">
              <BellRing aria-hidden className="h-3.5 w-3.5 text-ember" />
              {t.following.noteTitle}
            </span>
            <button
              type="button"
              onClick={() => setNoteOpen(false)}
              aria-label={t.report.close}
              className="-m-1 cursor-pointer p-1 text-graphite transition-colors hover:text-chalk"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
            </button>
          </span>
          <span className="text-caption text-ash">{t.following.noteBody}</span>
          <Link href="/following" className="w-fit text-caption font-medium text-chalk underline underline-offset-2 hover:text-ash">
            {t.following.noteLink}
          </Link>
        </span>
      )}
    </span>
  );
}
