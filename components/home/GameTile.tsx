"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { VERDICT } from "@/lib/ui/verdict";
import { useT } from "@/lib/i18n/client";
import type { AnalysisStatus } from "@/lib/pipeline/types";

export type GameTileData = {
  appId: number;
  name: string;
  image: string | null;
  status: AnalysisStatus | null;
  /** An extra fact under the name (a list's reason for including it). */
  detail?: string;
  /** The detail is news for the visitor (a followed game changed). */
  alert?: boolean;
};

/** One cell of a collapsed-border grid: every tile draws its full border
 * and is pulled 1px up/left (the grid pads 1px back), so neighbours share a
 * single line and a half-empty last row doesn't leave stray edges. On hover
 * the art pushes in, the verdict's color sweeps along its bottom edge and an
 * arrow says the tile opens the game. */
export default function GameTile({ game }: { game: GameTileData }) {
  const t = useT();
  const verdict = game.status ? VERDICT[game.status] : null;
  const Icon = verdict?.icon;

  return (
    <Link
      href={`/games/${game.appId}`}
      className="group -ml-px -mt-px flex flex-col border border-carbon bg-void/85 transition-colors duration-300 hover:bg-cinder focus-visible:-outline-offset-1"
    >
      <div className="relative aspect-[460/215] w-full overflow-hidden bg-cinder">
        {game.image && (
          <Image
            src={game.image}
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, 320px"
            className="object-cover transition-[transform,filter] duration-500 ease-out group-hover:scale-[1.06] group-hover:brightness-110 group-focus-visible:scale-[1.06] motion-reduce:group-hover:scale-100"
          />
        )}
        <span
          aria-hidden
          className="absolute right-2 top-2 flex h-7 w-7 translate-y-1 items-center justify-center bg-void/80 text-chalk opacity-0 backdrop-blur-sm transition-[opacity,transform] duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
        >
          <ArrowUpRight className="h-4 w-4" />
        </span>
        <span
          aria-hidden
          className={`absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 ease-out group-hover:scale-x-100 group-focus-visible:scale-x-100 ${verdict ? verdict.bg : "bg-ash"}`}
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <span className="line-clamp-2 text-body font-medium text-ash transition-colors duration-300 group-hover:text-chalk">{game.name}</span>
        {game.detail && (
          <span className={`flex items-start gap-1.5 text-caption ${game.alert ? "text-ember" : "text-graphite"}`}>
            {game.alert && <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />}
            {game.detail}
          </span>
        )}
        <span className={`mt-auto flex items-center gap-1.5 text-caption ${verdict ? verdict.text : "text-graphite"}`}>
          {Icon && <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />}
          {game.status ? t.verdict[game.status].label : t.home.notChecked}
        </span>
      </div>
    </Link>
  );
}

export function GameTileSkeleton() {
  return (
    <div aria-hidden className="-ml-px -mt-px flex flex-col border border-carbon">
      <div className="aspect-[460/215] w-full animate-pulse bg-cinder" />
      <div className="flex flex-col gap-3 p-4">
        <div className="h-4 w-3/4 animate-pulse bg-cinder" />
        <div className="h-3 w-1/3 animate-pulse bg-cinder" />
      </div>
    </div>
  );
}
