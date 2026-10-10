"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/client";
import { reportClientError } from "@/lib/errors/report";

/** Shown when a page breaks. A server error (it has a digest) is already in
 * the error log via instrumentation.ts; a browser one is reported here. */
export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const t = useT();
  useEffect(() => {
    if (!error.digest) reportClientError(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col justify-end gap-10 px-4 pb-24 pt-24 sm:px-6">
      <div className="flex flex-col gap-5">
        <p className="text-nav text-graphite">{t.errorPage.label}</p>
        <h1 className="text-mega font-semibold">{t.errorPage.title}</h1>
      </div>
      <div className="flex max-w-87.5 flex-col gap-4">
        <p className="text-body text-ash">{t.errorPage.body}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => retry()}
            className="w-fit cursor-pointer border border-fog px-2 py-1 text-nav font-medium transition-colors hover:bg-chalk hover:text-void"
          >
            {t.errorPage.retry}
          </button>
          <Link href="/" className="w-fit border border-carbon px-2 py-1 text-nav font-medium text-ash transition-colors hover:text-chalk">
            {t.errorPage.home}
          </Link>
        </div>
      </div>
    </main>
  );
}
