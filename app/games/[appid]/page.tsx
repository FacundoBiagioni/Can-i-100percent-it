import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Image from "next/image";
import { getOrCreateGame } from "@/lib/db/queries/games";
import { getAppDetails } from "@/lib/pipeline/layers/1-steam/client";
import { getMaxDiscountCut } from "@/lib/pricing/itad";
import { getRegionalPrice } from "@/lib/pricing/steamPrices";
import { getRegion } from "@/lib/pricing/server";
import { countryName } from "@/lib/pricing/regions";
import { getCachedAnalysis, priceDlcForRegion } from "@/lib/pipeline/getOrRunAnalysis";
import { getFlaggedAchievements, getHiddenAchievementNames } from "@/lib/db/queries/achievements";
import { HiddenNamesProvider } from "@/components/result/SpoilerContext";
import { maskHiddenNames } from "@/lib/spoilers";
import VerdictBlock from "@/components/result/VerdictBlock";
import VerdictActions from "@/components/result/VerdictActions";
import RecordRecent from "@/components/result/RecordRecent";
import BottomSheet from "@/components/result/BottomSheet";
import AnalysisLoader from "@/components/result/AnalysisLoader";
import { formatPrice } from "@/lib/ui/price";
import { getT } from "@/lib/i18n/server";
import { localizeReasoning } from "@/lib/i18n/reasoning";

/** Per-game title/description, so a shared link previews the verdict
 * ("Team Fortress 2: 100% impossible") instead of the site's generic text.
 * Read-only and cached: no game row is created just to build metadata. */
export async function generateMetadata(props: PageProps<"/games/[appid]">): Promise<Metadata> {
  const { appid } = await props.params;
  const appId = Number(appid);
  if (!Number.isInteger(appId) || appId <= 0) return {};
  const [details, analysis, t] = await Promise.all([getAppDetails(appId), getCachedAnalysis(appId), getT()]);
  if (!details) return {};
  const title = analysis ? `${details.name}: ${t.verdict[analysis.status].label}` : details.name;
  // Share previews come from crawlers, which have no settings: hidden
  // achievement names are always covered here.
  const description = analysis
    ? maskHiddenNames(localizeReasoning(analysis.reasoning, t), await getHiddenAchievementNames(appId), t.achievements.hiddenTitle)
    : t.meta.gameDescription(details.name);
  return {
    title: `${title} | can i 100% it?`,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  };
}

export default async function GamePage(props: PageProps<"/games/[appid]">) {
  const { appid } = await props.params;
  const appId = Number(appid);
  if (!Number.isInteger(appId) || appId <= 0) notFound();

  // Cheap (24h cache), and needed before anything is stored: a DLC's own
  // appid has no achievements of its own (they live in the base game's
  // list) and zero players, so analyzing it as a game produced nonsense
  // like "requires multiplayer, servers appear offline". Send the visitor
  // to the game it belongs to instead.
  const [details, t, region] = await Promise.all([getAppDetails(appId), getT(), getRegion()]);
  if (details?.type === "dlc" && details.fullGameAppId) redirect(`/games/${details.fullGameAppId}`);

  // Everything else at once: none of it depends on the rest. The analysis
  // read is cache-only and never blocks on a first-time pipeline run; if
  // there's none yet, AnalysisLoader starts it client-side and swaps itself
  // for the result once it lands, no manual reload. The price is the
  // visitor's store, in its own currency, and the biggest % Steam has ever
  // discounted the game there (via IsThereAnyDeal), applied to that store's
  // regular price so both figures are in the same currency.
  const [game, stored, achievementsIfAny, hiddenNames, storePrice, maxDiscountCut] = await Promise.all([
    getOrCreateGame(appId),
    getCachedAnalysis(appId),
    getFlaggedAchievements(appId),
    getHiddenAchievementNames(appId),
    getRegionalPrice(appId, region.cc),
    getMaxDiscountCut(appId, region.cc),
  ]);
  if (!game) notFound();
  const analysis = stored && (await priceDlcForRegion(stored, region.cc));
  const achievements = analysis ? achievementsIfAny : [];
  const money = (cents: number) => formatPrice(cents, region.currency, t.numberLocale);
  const country = countryName(region.cc, t.numberLocale);
  const heroImage = details?.heroImage || game.headerImageUrl;

  const isFree = storePrice?.isFree ?? false;
  const currentPrice =
    storePrice && !storePrice.isFree && storePrice.priceCents !== null
      ? { priceCents: storePrice.priceCents }
      : null;
  // Steam's own live discount on this price — shown as a struck-through
  // "was" price next to the current one, not folded into "the" price, so a
  // game that's just on sale right now doesn't read as if that were its
  // normal cost.
  const activeDiscount =
    storePrice && !storePrice.isFree && storePrice.discountPercent > 0 && storePrice.initialPriceCents !== null
      ? { percent: storePrice.discountPercent, initialPriceCents: storePrice.initialPriceCents }
      : null;
  const historicalLow =
    maxDiscountCut && maxDiscountCut > 0 && storePrice?.initialPriceCents
      ? {
          cut: maxDiscountCut,
          priceCents: Math.round(storePrice.initialPriceCents * (1 - maxDiscountCut / 100)),
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
                <span>{t.game.freeToPlay}</span>
              ) : (
                currentPrice && (
                  <span className="flex items-center gap-2">
                    {activeDiscount && (
                      <>
                        <span className="border border-pass px-1.5 text-caption font-semibold text-pass">
                          -{activeDiscount.percent}%
                        </span>
                        <span className="tabular-nums text-graphite line-through">
                          {money(activeDiscount.initialPriceCents)}
                        </span>
                      </>
                    )}
                    <span className={`tabular-nums ${activeDiscount ? "font-semibold text-chalk" : ""}`}>
                      {money(currentPrice.priceCents)}
                    </span>
                    <span>{t.game.storeIn(country)}</span>
                  </span>
                )
              )}
              {showHistoricalLow && (
                <>
                  <span aria-hidden className="hidden text-graphite sm:inline">/</span>
                  <span>
                    {t.game.lowestEver} <span className="font-semibold text-pass">-{historicalLow.cut}%</span>{" "}
                    <span className="tabular-nums">({money(historicalLow.priceCents)})</span>
                  </span>
                </>
              )}
              {atAllTimeLow && (
                <>
                  <span aria-hidden className="hidden text-graphite sm:inline">/</span>
                  <span>
                    <span className="font-semibold text-pass">{t.game.allTimeLow}</span>
                    {t.game.neverCheaper(country)}
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {analysis ? (
          <HiddenNamesProvider names={hiddenNames}>
            <div className="flex flex-col gap-5">
              <VerdictBlock analysis={analysis} />
              <VerdictActions appId={appId} gameName={game.name} status={analysis.status} />
            </div>
          </HiddenNamesProvider>
        ) : (
          <AnalysisLoader appId={appId} name={game.name} image={game.headerImageUrl ?? null} />
        )}
      </div>

      {analysis && analysis.status !== "no_achievements" && (
        <HiddenNamesProvider names={hiddenNames}>
          <BottomSheet analysis={analysis} achievements={achievements} />
        </HiddenNamesProvider>
      )}
    </main>
  );
}
