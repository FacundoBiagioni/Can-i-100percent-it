import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import FollowingGames from "@/components/following/FollowingGames";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  // Personal (the list lives in each browser): nothing here for search engines.
  return { title: `${t.following.title} | can i 100% it?`, description: t.following.description, robots: { index: false } };
}

export default async function FollowingPage() {
  const t = await getT();
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-16 px-4 pb-32 pt-24 sm:px-6">
      <header className="flex flex-col gap-6">
        <p className="text-nav text-graphite">{t.following.label}</p>
        <h1 className="text-display font-semibold text-balance">{t.following.title}</h1>
        <p className="max-w-xl text-body text-ash">{t.following.intro}</p>
      </header>
      <FollowingGames variant="page" />
    </main>
  );
}
