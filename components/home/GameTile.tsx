import Link from "next/link";
import Image from "next/image";
import { VERDICT } from "@/lib/ui/verdict";
import type { AnalysisStatus } from "@/lib/pipeline/types";

export type GameTileData = {
  appId: number;
  name: string;
  image: string | null;
  status: AnalysisStatus | null;
};

/** One cell of a collapsed-border grid: every tile draws its full border
 * and is pulled 1px up/left (the grid pads 1px back), so neighbours share a
 * single line and a half-empty last row doesn't leave stray edges. Art
 * stays monochrome until hovered/focused. */
export default function GameTile({ game }: { game: GameTileData }) {
  const verdict = game.status ? VERDICT[game.status] : null;
  const Icon = verdict?.icon;

  return (
    <Link
      href={`/games/${game.appId}`}
      className="group -ml-px -mt-px flex flex-col border border-carbon transition-colors hover:bg-cinder focus-visible:-outline-offset-1"
    >
      <div className="relative aspect-[460/215] w-full overflow-hidden bg-cinder">
        {game.image && (
          <Image
            src={game.image}
            alt=""
            fill
            sizes="(max-width: 768px) 50vw, 320px"
            className="object-cover grayscale transition-[filter] duration-300 group-hover:grayscale-0 group-focus-visible:grayscale-0"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <span className="line-clamp-2 text-body font-medium text-chalk">{game.name}</span>
        <span className={`mt-auto flex items-center gap-1.5 text-caption ${verdict ? verdict.text : "text-graphite"}`}>
          {Icon && <Icon aria-hidden className="h-3.5 w-3.5 shrink-0" />}
          {verdict ? verdict.label : "Not checked yet"}
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
