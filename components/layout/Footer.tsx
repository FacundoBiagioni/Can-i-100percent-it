import Link from "next/link";
import LogoMark from "@/components/brand/LogoMark";
import { getT } from "@/lib/i18n/server";
import { getRegion } from "@/lib/pricing/server";
import { countryName } from "@/lib/pricing/regions";

const SOURCES = [
  { name: "Steam", url: "https://store.steampowered.com" },
  { name: "SteamHunters", url: "https://steamhunters.com" },
  { name: "Achievement Scouts", url: "https://achievement-scouts.com" },
  { name: "IsThereAnyDeal", url: "https://isthereanydeal.com" },
];

const LINK = "text-ash transition-colors hover:text-chalk";

/** On every page: the site's pages, the legal pages, credit to the data
 * sources, and the store region and "not affiliated" notes. Sits above any
 * fixed page background (the game page's art). */
export default async function Footer() {
  const [t, region] = await Promise.all([getT(), getRegion()]);
  return (
    // Pages with the fixed bottom sheet (game pages) get room below the
    // footer so the sheet's peek doesn't cover it.
    <footer className="relative z-10 border-t border-carbon bg-void [body:has([data-bottom-sheet])_&]:pb-24">
      <div className="mx-auto flex max-w-page flex-col gap-4 px-4 py-8 text-caption text-graphite sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
          <nav aria-label={t.footer.nav} className="flex flex-wrap gap-x-4 gap-y-2">
            <span className="flex items-center gap-2 text-chalk">
              <LogoMark size={20} />
              can i 100% it?
            </span>
            <Link href="/library" className={LINK}>
              {t.nav.library}
            </Link>
            <Link href="/how-it-works" className={LINK}>
              {t.nav.howItWorks}
            </Link>
            <Link href="/about" className={LINK}>
              {t.nav.about}
            </Link>
            <Link href="/privacy" className={LINK}>
              {t.footer.privacy}
            </Link>
            <Link href="/terms" className={LINK}>
              {t.footer.terms}
            </Link>
          </nav>
          <p>
            {t.priceRegion(countryName(region.cc, t.numberLocale))}. {t.home.notAffiliated}
          </p>
        </div>
        <p className="flex flex-wrap gap-x-2 gap-y-1">
          <span>{t.footer.dataFrom}</span>
          {SOURCES.map((s, i) => (
            <span key={s.name}>
              <a href={s.url} target="_blank" rel="noreferrer" className={LINK}>
                {s.name}
              </a>
              {i < SOURCES.length - 1 && <span aria-hidden> · </span>}
            </span>
          ))}
        </p>
      </div>
    </footer>
  );
}
