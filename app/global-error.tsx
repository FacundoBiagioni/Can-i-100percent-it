"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/errors/report";
import "./globals.css";

/** Last resort, when the root layout itself breaks: no header, no i18n
 * provider, so the text is in both languages. */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    if (!error.digest) reportClientError(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col justify-end gap-6 bg-void p-6 text-chalk">
        <title>can i 100% it?</title>
        <h1 className="text-heading-lg font-semibold">Something went wrong. / Algo salió mal.</h1>
        <button
          type="button"
          onClick={() => retry()}
          className="w-fit cursor-pointer border border-fog px-2 py-1 text-nav font-medium transition-colors hover:bg-chalk hover:text-void"
        >
          Try again / Reintentar
        </button>
      </body>
    </html>
  );
}
