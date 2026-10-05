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
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-16 px-4 pb-32 pt-24 sm:px-6">
      <section className="flex flex-col gap-6">
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
        <SteamProfileWindow profile={profile} t={t} />
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
