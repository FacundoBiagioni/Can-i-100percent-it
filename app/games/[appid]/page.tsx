import { notFound } from "next/navigation";
import { getOrCreateGame } from "@/lib/db/queries/games";
import { getAppDetails } from "@/lib/pipeline/layers/1-steam/client";
import { getCachedAnalysis } from "@/lib/pipeline/getOrRunAnalysis";
import { getFlaggedAchievements } from "@/lib/db/queries/achievements";
import StatusBadge from "@/components/result/StatusBadge";
import ConfidencePill from "@/components/result/ConfidencePill";
import StatusIconRow from "@/components/result/StatusIconRow";
import BottomSheet from "@/components/result/BottomSheet";
import AnalysisLoader from "@/components/result/AnalysisLoader";

export default async function GamePage(props: PageProps<"/games/[appid]">) {
  const { appid } = await props.params;
  const appId = Number(appid);
  if (!Number.isInteger(appId) || appId <= 0) notFound();

  const game = await getOrCreateGame(appId);
  if (!game) notFound();

  // Redundant with getOrCreateGame's own Steam call, but cheap (24h cache)
  // — the DB row only stores the small header image, not the hero-sized one.
  const details = await getAppDetails(appId);

  // Read-only check — never blocks the page on a first-time pipeline run.
  // If nothing's cached yet, AnalysisLoader kicks the run off client-side
  // and swaps itself for the real result once it lands, no manual reload.
  const analysis = await getCachedAnalysis(appId);
  const achievements = analysis ? await getFlaggedAchievements(appId) : [];
  const heroImage = details?.heroImage || game.headerImageUrl;

  return (
    <main className="relative flex-1 bg-black">
      {heroImage && (
        <div className="fixed inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/85" />
        </div>
      )}

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 px-6 pb-32 pt-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-4xl">
          {game.name}
        </h1>
        <p className="text-sm text-zinc-300 drop-shadow">
          Steam AppID {game.id}
          {game.releaseDate ? ` · Released ${game.releaseDate}` : ""}
        </p>

        {analysis ? (
          <div className="flex flex-col items-center gap-4">
            <div className="flex flex-col items-center gap-3">
              <StatusBadge status={analysis.status} />
              <ConfidencePill confidence={analysis.confidence} />
            </div>
            <StatusIconRow analysis={analysis} />
          </div>
        ) : (
          <AnalysisLoader appId={appId} />
        )}
      </div>

      {analysis && <BottomSheet analysis={analysis} achievements={achievements} />}
    </main>
  );
}
