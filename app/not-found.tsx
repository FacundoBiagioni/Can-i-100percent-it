import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col justify-end gap-10 px-4 pb-24 pt-24 sm:px-6">
      <div className="flex flex-col gap-5">
        <p className="text-nav text-graphite">{t.notFound.label}</p>
        <h1 className="text-mega font-semibold">
          {t.notFound.title[0]}
          <br />
          {t.notFound.title[1]}
        </h1>
      </div>
      {/* No search box here: the header already shows one on this route. */}
      <div className="flex max-w-87.5 flex-col gap-4">
        <p className="text-body text-ash">
          {t.notFound.body}
        </p>
        <Link
          href="/"
          className="w-fit border border-fog px-2 py-1 text-nav font-medium transition-colors hover:bg-chalk hover:text-void"
        >
          {t.notFound.back}
        </Link>
      </div>
    </main>
  );
}
