import type { Metadata } from "next";
import { Suspense } from "react";
import LibraryChecker from "@/components/library/LibraryChecker";

export const metadata: Metadata = {
  title: "Your library | can i 100% it?",
  description: "Paste your Steam profile link and see which of your games can't be fully completed, or need paid DLC to reach 100%.",
};

export default function LibraryPage() {
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-16 px-4 pb-32 pt-24 sm:px-6">
      <section className="flex flex-col gap-6">
        <p className="text-nav text-graphite">Library</p>
        <h1 className="text-display font-semibold text-balance">Check your whole library.</h1>
        <p className="max-w-xl text-body text-ash">
          See which of your Steam games can&apos;t be fully completed anymore, and which need paid DLC to reach 100%.
        </p>
      </section>
      {/* useSearchParams needs a Suspense boundary to keep the page static. */}
      <Suspense>
        <LibraryChecker />
      </Suspense>
    </main>
  );
}
