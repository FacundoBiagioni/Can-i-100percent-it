import type { Metadata } from "next";
import { getT } from "@/lib/i18n/server";
import { getListCounts, LIST_SLUGS } from "@/lib/lists/lists";
import ListLinks from "@/components/lists/ListLinks";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t.lists.indexTitle} | can i 100% it?`, description: t.lists.indexDescription };
}

export default async function ListsPage() {
  const [t, counts] = await Promise.all([getT(), getListCounts()]);
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-16 px-4 pb-32 pt-24 sm:px-6">
      <header className="flex flex-col gap-6">
        <p className="text-nav text-graphite">{t.lists.label}</p>
        <h1 className="text-display font-semibold text-balance">{t.lists.indexTitle}</h1>
        <p className="max-w-xl text-body text-ash">{t.lists.indexIntro}</p>
      </header>
      <ListLinks slugs={LIST_SLUGS} counts={counts} t={t} />
    </main>
  );
}
