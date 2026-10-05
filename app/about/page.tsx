import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import SteamProfileWindow from "@/components/about/SteamProfileWindow";
import { CREATOR_PROFILE_URL, getCreatorProfile } from "@/lib/about/creatorProfile";
import { getLocale } from "@/lib/i18n/server";
import { DICTIONARIES } from "@/lib/i18n/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = DICTIONARIES[await getLocale()];
  return { title: `${t.meta.aboutTitle} | can i 100% it?`, description: t.meta.aboutDescription };
}

export default async function AboutPage() {
  const locale = await getLocale();
  const t = DICTIONARIES[locale];
  // Cached for 6 hours per language: new showcases and levels show up on their own.
  const profile = await getCreatorProfile(locale);
  const perfect = profile?.perfectGames ?? null;

  return (
    <main className="relative mx-auto flex w-full max-w-page flex-1 flex-col gap-16 px-4 pb-32 pt-24 sm:px-6">
      {/* The creator's own Steam profile background behind the intro, fading
          to black before the profile window, so the two read as one. */}
      {profile?.background && (
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-0 h-[42rem] w-screen -translate-x-1/2 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={profile.background} alt="" className="absolute inset-0 h-full w-full object-cover object-top opacity-45" />
          <div className="absolute inset-0 bg-gradient-to-b from-void/40 via-void/60 to-void" />
          <div className="absolute inset-0 bg-gradient-to-r from-void/70 to-transparent" />
        </div>
      )}
      <section className="relative flex flex-col gap-6">
        <p className="text-nav text-graphite">{t.about.label}</p>
        <h1 className="text-display font-semibold text-balance">{t.about.title}</h1>
        <div className="flex max-w-xl flex-col gap-4 text-body text-ash">
          <p>
            {t.about.madeBy} <span className="text-chalk">Biagio360</span>
            {t.about.hunter(perfect)}
          </p>
          <p>
            {t.about.purpose}
          </p>
        </div>
      </section>

      {profile ? (
        <div className="relative">
          <SteamProfileWindow profile={profile} t={t} />
        </div>
      ) : (
        <a
          href={CREATOR_PROFILE_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-fit items-center gap-1 border border-fog px-2 py-1 text-nav font-medium transition-colors hover:bg-chalk hover:text-void"
        >
          {t.about.seeProfile}
          <ArrowUpRight aria-hidden className="h-3.5 w-3.5" />
        </a>
      )}

      <Link href="/" className="w-fit border border-fog px-2 py-1 text-nav font-medium transition-colors hover:bg-chalk hover:text-void">
        {t.about.cta}
      </Link>
    </main>
  );
}
