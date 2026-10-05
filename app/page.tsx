import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import SearchBox from "@/components/search/SearchBox";
import HeroAnimation from "@/components/home/HeroAnimation";
import RecentGames from "@/components/home/RecentGames";
import VerdictLegend from "@/components/home/VerdictLegend";
import type { GameTileData } from "@/components/home/GameTile";
import { getAppDetails } from "@/lib/pipeline/layers/1-steam/client";
import { getCachedAnalysis } from "@/lib/pipeline/getOrRunAnalysis";
import { getT } from "@/lib/i18n/server";

// Shown to first-time visitors in place of their (empty) recents. A mix of
// verdicts on purpose, so it reads as a real sample of what the tool says.
// Read-only: getCachedAnalysis never triggers a pipeline run, and a game
// that hasn't been analyzed yet just shows as "Not checked yet".
const RECOMMENDED_APP_IDS = [
  1145360, // Hades
  367520, // Hollow Knight
  234140, // Mad Max
  413150, // Stardew Valley
  620, // Portal 2
  105600, // Terraria
  1245620, // Elden Ring
  1086940, // Baldur's Gate 3
];

async function getRecommended(): Promise<GameTileData[]> {
  const games = await Promise.all(
    RECOMMENDED_APP_IDS.map(async (appId) => {
      const [details, analysis] = await Promise.all([getAppDetails(appId), getCachedAnalysis(appId)]);
      if (!details) return null;
      return { appId, name: details.name, image: details.headerImage ?? null, status: analysis?.status ?? null };
    }),
  );
  return games.filter((g): g is GameTileData => g !== null);
}

export default async function Home() {
  const [recommended, t] = await Promise.all([getRecommended(), getT()]);

  return (
    <main className="flex flex-1 flex-col">
      {/* overflow-x only: clipping the bottom would cut off the search results
          as they open past the hero's edge. HeroAnimation clips itself. */}
      <section className="relative flex min-h-[calc(100dvh-3rem)] flex-col overflow-x-clip">
        <HeroAnimation />

        {/* z-20: above the scroll hint, so open search results cover it. */}
        <div className="relative z-20 mx-auto flex w-full max-w-page flex-1 flex-col justify-end gap-10 px-4 pb-28 pt-16 sm:px-6">
          <div className="flex flex-col gap-5">
            <p className="text-nav text-ash">{t.home.eyebrow}</p>
            <h1 className="text-mega font-semibold">
              Can i<br />
              100% it?
            </h1>
          </div>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="flex max-w-87.5 flex-col gap-3">
              <p className="text-body text-ash">
                {t.home.intro}
              </p>
              <Link
                href="/library"
                className="flex w-fit items-center gap-1 text-body text-chalk underline underline-offset-4 transition-colors hover:text-ash"
              >
                {t.home.libraryLink}
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </div>
            <SearchBox size="lg" label={t.search.label} />
          </div>
        </div>

        <a
          href="#recent"
          className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 text-body text-chalk transition-colors hover:text-ash"
        >
          {t.home.scroll}
          <ArrowDown aria-hidden className="h-4 w-4" style={{ animation: "nudge-down 2s ease-in-out infinite" }} />
        </a>
      </section>

      <div className="mx-auto flex w-full max-w-page flex-col gap-32 px-4 py-32 sm:px-6">
        <section id="recent" className="scroll-mt-20">
          <RecentGames recommended={recommended} />
        </section>
        <section id="verdicts" className="scroll-mt-20">
          <VerdictLegend />
        </section>
      </div>

      <footer className="border-t border-carbon">
        <div className="mx-auto flex max-w-page flex-col gap-2 px-4 py-6 text-caption text-graphite sm:flex-row sm:justify-between sm:px-6">
          <span className="flex gap-4">
            <span>can i 100% it?</span>
            <Link href="/how-it-works" className="text-ash transition-colors hover:text-chalk">
              {t.nav.howItWorks}
            </Link>
            <Link href="/about" className="text-ash transition-colors hover:text-chalk">
              {t.nav.about}
            </Link>
          </span>
          <span>
            {t.priceRegion}. {t.home.notAffiliated}
          </span>
        </div>
      </footer>
    </main>
  );
}
