import type { LegalDoc } from "@/lib/legal/content";

/** Shared layout for the privacy policy and the terms: the site's editorial
 * look, a numbered index of sections, readable line length. */
export default function LegalPage({ doc, label }: { doc: LegalDoc; label: string }) {
  return (
    <main className="mx-auto flex w-full max-w-page flex-1 flex-col gap-16 px-4 pb-32 pt-24 sm:px-6">
      <header className="flex flex-col gap-6">
        <p className="text-nav text-graphite">{label}</p>
        <h1 className="text-display font-semibold text-balance">{doc.title}</h1>
        <p className="max-w-xl text-body text-ash">{doc.intro}</p>
        <p className="text-caption text-graphite">{doc.updated}</p>
      </header>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[16rem_1fr]">
        <nav aria-label={doc.title} className="hidden lg:block">
          <ol className="sticky top-24 flex flex-col gap-2 text-nav text-graphite">
            {doc.sections.map((s, i) => (
              <li key={s.heading}>
                <a href={`#s${i + 1}`} className="transition-colors hover:text-chalk">
                  <span className="mr-2 tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="flex max-w-2xl flex-col">
          {doc.sections.map((s, i) => (
            <section key={s.heading} id={`s${i + 1}`} className="scroll-mt-20 border-t border-carbon py-8 first:border-t-0 first:pt-0">
              <h2 className="mb-4 flex items-baseline gap-3 text-heading-sm font-semibold">
                <span className="text-nav tabular-nums text-graphite">{String(i + 1).padStart(2, "0")}</span>
                {s.heading}
              </h2>
              <div className="flex flex-col gap-3 text-body text-ash">
                {s.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
