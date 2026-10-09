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

      <section className="flex flex-col gap-8 border-t border-carbon pt-16">
        <div className="flex flex-col gap-3">
          <p className="text-nav text-graphite">{t.following.howLabel}</p>
          <h2 className="text-heading-lg font-semibold">{t.following.howTitle}</h2>
        </div>
        <ol className="grid grid-cols-1 pl-px pt-px sm:grid-cols-2 lg:grid-cols-4">
          {t.following.howSteps.map((step, i) => (
            <li key={step.title} className="-ml-px -mt-px flex flex-col gap-3 border border-carbon p-6">
              <span className="text-nav tabular-nums text-graphite">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="text-heading-sm font-semibold">{step.title}</h3>
              <p className="text-body text-ash">{step.body}</p>
            </li>
          ))}
        </ol>
        <p className="max-w-2xl text-body text-graphite">{t.following.howNote}</p>
      </section>
    </main>
  );
}
