import { notFound } from "next/navigation";
import { getOrCreateGame } from "@/lib/db/queries/games";
import { getAppDetails, getArgentinaPricing } from "@/lib/pipeline/layers/1-steam/client";
import { getArgentinaDeal } from "@/lib/pricing/itad";
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

  // getArgentinaDeal (IsThereAnyDeal) gives the real ARS price and the
  // genuine historical-low discount %; getArgentinaPricing (Steam directly)
  // is the fallback for games ITAD hasn't catalogued — still a real
  // discounted AR price, just USD-denominated since our server isn't seen
  // as Argentina-based.
  const [arPricing, arDeal] = await Promise.all([getArgentinaPricing(appId), getArgentinaDeal(appId)]);
  const isFree = arPricing?.isFree ?? false;
  const currentPrice = arDeal?.current
    ? { priceCents: arDeal.current.priceCents, currency: arDeal.current.currency }
    : arPricing && !arPricing.isFree && arPricing.priceCents !== null
      ? { priceCents: arPricing.priceCents, currency: arPricing.currency }
      : null;
  const historicalLow = arDeal?.historicalLow && arDeal.historicalLow.cut > 0 ? arDeal.historicalLow : null;

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

        {(isFree || currentPrice) && (
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-zinc-300 drop-shadow">
            {isFree ? (
              <span>Free to play</span>
            ) : (
              currentPrice && <span>{formatPrice(currentPrice.priceCents, currentPrice.currency)} in Argentina</span>
            )}
            {historicalLow && (
              <>
                <span className="text-zinc-600">·</span>
                <span>
                  Lowest ever: <span className="font-semibold text-emerald-400">-{historicalLow.cut}%</span> (
                  {formatPrice(historicalLow.priceCents, historicalLow.currency)})
                </span>
              </>
            )}
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
