import type { Metadata } from "next";
import { Suspense } from "react";
import LibraryChecker from "@/components/library/LibraryChecker";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: `${t.meta.libraryTitle} | can i 100% it?`, description: t.meta.libraryDescription };
}

export default async function LibraryPage() {
  const t = await getT();
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-16 px-4 pb-32 pt-24 sm:px-6">
      <section className="flex flex-col gap-6">
        <p className="text-nav text-graphite">{t.library.label}</p>
        <h1 className="text-display font-semibold text-balance">{t.library.title}</h1>
        <p className="max-w-xl text-body text-ash">
          {t.library.intro}
        </p>
      </section>
      {/* useSearchParams needs a Suspense boundary to keep the page static. */}
      <Suspense>
        <LibraryChecker />
      </Suspense>
    </main>
  );
}
