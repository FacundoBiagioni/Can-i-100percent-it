import Link from "next/link";
import Image from "next/image";
import { getGameWithDlc } from "@/lib/db/queries/games";
import { getCachedAnalysis } from "@/lib/pipeline/getOrRunAnalysis";
import type { AnalysisStatus } from "@/lib/pipeline/types";

// A small, deliberately mixed set of already-analyzed games — one clean
// green, one confirmed red, one green-with-a-caveat — so this reads as a
// real sample of what the tool says, not a cherry-picked "everything's
// fine" row. Read-only (getCachedAnalysis never triggers a pipeline run),
// so this costs nothing if a game isn't analyzed yet — it's just skipped.
const EXAMPLE_APP_IDS = [1145360, 234140, 367520]; // Hades, Mad Max, Hollow Knight

const STATUS_DOT: Record<AnalysisStatus, string> = {
  green: "bg-emerald-400",
  red: "bg-red-400",
  yellow: "bg-amber-400",
  no_achievements: "bg-zinc-400",
};

export default async function ExampleVerdicts() {
  const cards = await Promise.all(
    EXAMPLE_APP_IDS.map(async (appId) => {
      const [game, analysis] = await Promise.all([getGameWithDlc(appId), getCachedAnalysis(appId)]);
      if (!game || !analysis) return null;
      return { appId, name: game.name, image: game.headerImageUrl, status: analysis.status };
    }),
  );
  const valid = cards.filter((c): c is NonNullable<typeof c> => c !== null);
  if (valid.length === 0) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">See it in action</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {valid.map((c) => (
          <Link
            key={c.appId}
            href={`/games/${c.appId}`}
            className="group flex items-center gap-2 rounded-full border border-zinc-700/80 bg-black/40 py-1.5 pl-1.5 pr-4 backdrop-blur-sm transition hover:border-zinc-500 hover:bg-black/60"
          >
            {c.image && (
              <Image src={c.image} alt="" width={56} height={32} className="rounded-lg object-cover" />
            )}
            <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[c.status]}`} />
            <span className="text-xs font-medium text-zinc-200 sm:text-sm">{c.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
