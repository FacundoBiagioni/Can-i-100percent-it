import { notFound } from "next/navigation";
import { getOrCreateGame } from "@/lib/db/queries/games";
import { getAppDetails, getArgentinaPricing } from "@/lib/pipeline/layers/1-steam/client";
import { getCachedAnalysis } from "@/lib/pipeline/getOrRunAnalysis";
import { getFlaggedAchievements } from "@/lib/db/queries/achievements";
import StatusBadge from "@/components/result/StatusBadge";
import ConfidencePill from "@/components/result/ConfidencePill";
import StatusIconRow from "@/components/result/StatusIconRow";
import BottomSheet from "@/components/result/BottomSheet";
import AnalysisLoader from "@/components/result/AnalysisLoader";

function formatPrice(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

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
  const arPricing = await getArgentinaPricing(appId);

  return (
    <main className="relative flex-1 bg-black">
      {heroImage && (
        <div className="fixed inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={heroImage} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/85" />
        </div>
      )}

      <div className="relative z-10 flex min-h-[calc(100vh-4rem)] flex-col items-center justify-end gap-4 px-6 pb-10 text-center">
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden
            className="pointer-events-none absolute h-28 w-[28rem] max-w-[85vw] rounded-full bg-white/25 blur-3xl"
          />
          <h1 className="relative text-3xl font-extrabold tracking-tight text-white drop-shadow-lg sm:text-4xl">
            {game.name}
          </h1>
        </div>

        {arPricing && (
          <div className="flex items-center gap-3 text-sm text-zinc-300 drop-shadow">
            {arPricing.isFree ? (
              <span>Free to play</span>
            ) : arPricing.priceCents !== null ? (
              <span>{formatPrice(arPricing.priceCents, arPricing.currency)} in Argentina</span>
            ) : null}
          </div>
        )}

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
