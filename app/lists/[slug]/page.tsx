import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { getList, isListSlug, LIST_SLUGS, MIN_INDEXABLE } from "@/lib/lists/lists";
import { formatDetail } from "@/lib/lists/format";
import GameTile from "@/components/home/GameTile";
import ListLinks from "@/components/lists/ListLinks";

export async function generateMetadata(props: PageProps<"/lists/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  if (!isListSlug(slug)) return {};
  const [t, entries] = await Promise.all([getT(), getList(slug)]);
  const { title, description } = t.lists.items[slug];
  return {
    title: `${title} | can i 100% it?`,
    description,
    openGraph: { title, description },
    twitter: { title, description },
    // A near-empty list is a thin page; it joins search once it fills up.
    robots: entries.length < MIN_INDEXABLE ? { index: false, follow: true } : undefined,
  };
}

export default async function ListPage(props: PageProps<"/lists/[slug]">) {
  const { slug } = await props.params;
  if (!isListSlug(slug)) notFound();
  const [t, entries] = await Promise.all([getT(), getList(slug)]);
  const item = t.lists.items[slug];

  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-16 px-4 pb-32 pt-24 sm:px-6">
      <header className="flex flex-col gap-6">
        <Link href="/lists" className="w-fit text-nav text-graphite transition-colors hover:text-chalk">
          {t.lists.label}
        </Link>
        <h1 className="max-w-4xl text-heading-lg font-semibold text-balance">{item.title}</h1>
        <p className="max-w-xl text-body text-ash">{item.intro}</p>
        <p className="text-caption text-graphite">
          {t.lists.games(entries.length)} · {t.lists.updated}
        </p>
      </header>

      {entries.length === 0 ? (
        <p className="text-body text-graphite">{t.lists.empty}</p>
      ) : (
        <ol className="grid grid-cols-2 pl-px pt-px md:grid-cols-4">
          {entries.map((e) => (
            <li key={e.appId} className="flex [&>a]:flex-1">
              <GameTile
                game={{ appId: e.appId, name: e.name, image: e.image, status: e.status, detail: formatDetail(e.detail, t) }}
              />
            </li>
          ))}
        </ol>
      )}

      <section className="flex flex-col gap-6">
        <h2 className="text-nav text-graphite">{t.lists.more}</h2>
        <ListLinks slugs={LIST_SLUGS.filter((s) => s !== slug)} t={t} />
      </section>
    </main>
  );
}
