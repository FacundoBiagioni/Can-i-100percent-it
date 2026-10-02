import { notFound } from "next/navigation";
import Image from "next/image";
import { getOrCreateGame } from "@/lib/db/queries/games";
import { getAppDetails, getArgentinaPricing } from "@/lib/pipeline/layers/1-steam/client";
import { getArgentinaMaxDiscountCut } from "@/lib/pricing/itad";
import { getCachedAnalysis } from "@/lib/pipeline/getOrRunAnalysis";
import { getFlaggedAchievements } from "@/lib/db/queries/achievements";
import VerdictBlock from "@/components/result/VerdictBlock";
import RecordRecent from "@/components/result/RecordRecent";
import BottomSheet from "@/components/result/BottomSheet";
import AnalysisLoader from "@/components/result/AnalysisLoader";
import { formatPrice } from "@/lib/ui/price";

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

  // getArgentinaPricing is Steam's own AR-regional price — genuinely
  // discounted vs. US, but denominated in USD since our server isn't seen
  // as Argentina-based (that's how Steam itself shows this region, so it's
  // shown as-is rather than converted). getArgentinaMaxDiscountCut is the
  // biggest % Steam has ever discounted this game in Argentina (via
  // IsThereAnyDeal, whose own price data is in real ARS) — applied to the
  // current USD regular price rather than shown in ITAD's own currency, to
  // keep both figures in the same USD terms.
  const [arPricing, maxDiscountCut] = await Promise.all([getArgentinaPricing(appId), getArgentinaMaxDiscountCut(appId)]);
  const isFree = arPricing?.isFree ?? false;
  const currentPrice =
    arPricing && !arPricing.isFree && arPricing.priceCents !== null
      ? { priceCents: arPricing.priceCents }
      : null;
  // Steam's own live discount on this price — shown as a struck-through
  // "was" price next to the current one, not folded into "the" price, so a
  // game that's just on sale right now doesn't read as if that were its
  // normal cost.
  const activeDiscount =
    arPricing && !arPricing.isFree && arPricing.discountPercent > 0 && arPricing.initialPriceCents !== null
      ? { percent: arPricing.discountPercent, initialPriceCents: arPricing.initialPriceCents }
      : null;
  const historicalLow =
    maxDiscountCut && maxDiscountCut > 0 && arPricing?.initialPriceCents
      ? {
          cut: maxDiscountCut,
          priceCents: Math.round(arPricing.initialPriceCents * (1 - maxDiscountCut / 100)),
        }
      : null;
  // On sale right now at (or past) the biggest discount it has ever had.
  // Compared by %, not by derived price, so rounding can't hide a match —
  // and a sale that sets a new record still counts even before ITAD's
  // cached figure (up to 12h old) catches up.
  const atAllTimeLow = activeDiscount !== null && historicalLow !== null && activeDiscount.percent >= historicalLow.cut;
  // Otherwise point at the record low, unless the current price already
  // beats it.
  const showHistoricalLow =
    historicalLow && !atAllTimeLow && (!currentPrice || historicalLow.priceCents < currentPrice.priceCents);

  return (
    <main className="relative flex-1 bg-void">
      <RecordRecent appId={appId} name={game.name} image={game.headerImageUrl ?? null} status={analysis?.status ?? null} />

      {heroImage && (
        <div aria-hidden className="fixed inset-0 z-0">
          <Image src={heroImage} alt="" fill priority sizes="100vw" className="object-cover" />
          {/* Flat scrim, no gradient: legibility over any screenshot. */}
          <div className="absolute inset-0 bg-void/65" />
        </div>
      )}

      <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-3rem)] w-full max-w-page flex-col justify-end gap-8 px-4 pb-32 pt-24 sm:px-6 sm:pb-16">
        <div className="flex flex-col gap-4">
          <p className="text-nav text-ash">
            Steam <span className="text-graphite">/</span> {appId}
          </p>
          <h1 className="max-w-5xl text-display font-semibold text-balance">{game.name}</h1>

          {(isFree || currentPrice) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body text-ash">
              {isFree ? (
                <span>Free to play</span>
              ) : (
                currentPrice && (
                  <span className="flex items-center gap-2">
                    {activeDiscount && (
                      <>
                        <span className="border border-pass px-1.5 text-caption font-semibold text-pass">
                          -{activeDiscount.percent}%
                        </span>
                        <span className="tabular-nums text-graphite line-through">
                          {formatPrice(activeDiscount.initialPriceCents)}
                        </span>
                      </>
                    )}
                    <span className={`tabular-nums ${activeDiscount ? "font-semibold text-chalk" : ""}`}>
                      {formatPrice(currentPrice.priceCents)}
                    </span>
                    <span>USD, Steam Argentina</span>
                  </span>
                )
              )}
              {showHistoricalLow && (
                <>
                  <span aria-hidden className="hidden text-graphite sm:inline">/</span>
                  <span>
                    Lowest ever <span className="font-semibold text-pass">-{historicalLow.cut}%</span>{" "}
                    <span className="tabular-nums">({formatPrice(historicalLow.priceCents)})</span>
                  </span>
                </>
              )}
              {atAllTimeLow && (
                <>
                  <span aria-hidden className="hidden text-graphite sm:inline">/</span>
                  <span>
                    <span className="font-semibold text-pass">All-time low</span>, never been cheaper on Steam
                    Argentina
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {analysis ? (
          <VerdictBlock analysis={analysis} />
        ) : (
          <AnalysisLoader appId={appId} name={game.name} image={game.headerImageUrl ?? null} />
        )}
      </div>

      {analysis && analysis.status !== "no_achievements" && (
        <BottomSheet analysis={analysis} achievements={achievements} />
      )}
    </main>
  );
}
