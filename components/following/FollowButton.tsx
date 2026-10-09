"use client";

import { useEffect } from "react";
import { Bell, BellRing } from "lucide-react";
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

/** Follow / unfollow a game. While it's followed, opening its page marks its
 * current verdict and sale as seen, which clears its flag in Following. */
export default function FollowButton({ appId, name, image, status, lowestCut, className }: Props) {
  const t = useT();
  const following = useFollowing();
  const followed = following?.some((g) => g.appId === appId) ?? false;

  useEffect(() => {
    if (followed) markFollowedSeen(appId, status, lowestCut);
  }, [followed, appId, status, lowestCut]);

  // Storage isn't readable before hydration; keep the slot so nothing shifts.
  if (following === null) return <span aria-hidden className={`${className} invisible`}><Bell className="h-3.5 w-3.5" />{t.following.follow}</span>;

  return (
    <button
      type="button"
      aria-pressed={followed}
      onClick={() => (followed ? unfollowGame(appId) : followGame({ appId, name, image, status, seenCut: lowestCut }))}
      className={`${className} ${followed ? "border-fog text-chalk" : ""}`}
      title={followed ? t.following.unfollow : undefined}
    >
      {followed ? <BellRing aria-hidden className="h-3.5 w-3.5" /> : <Bell aria-hidden className="h-3.5 w-3.5" />}
      {followed ? t.following.followingNow : t.following.follow}
    </button>
  );
}
