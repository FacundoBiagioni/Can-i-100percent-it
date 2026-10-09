import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import type { ListSlug } from "@/lib/lists/lists";

/** The lists as cells of a collapsed-border grid: name, game count, arrow. */
export default function ListLinks({
  slugs,
  counts,
  t,
}: {
  slugs: readonly ListSlug[];
  counts?: Record<ListSlug, number>;
  t: Dictionary;
}) {
  return (
    <ul className="grid grid-cols-1 pl-px pt-px md:grid-cols-2">
      {slugs.map((slug) => (
        <li key={slug} className="-ml-px -mt-px flex border border-carbon">
          <Link
            href={`/lists/${slug}`}
            className="group flex flex-1 items-start justify-between gap-6 p-6 transition-colors duration-300 hover:bg-cinder"
          >
            <span className="flex flex-col gap-2">
              <span className="text-heading-sm font-semibold text-ash transition-colors group-hover:text-chalk">
                {t.lists.items[slug].short}
              </span>
              {counts && <span className="text-caption tabular-nums text-graphite">{t.lists.games(counts[slug])}</span>}
            </span>
            <ArrowUpRight aria-hidden className="h-5 w-5 shrink-0 text-graphite transition-colors group-hover:text-chalk" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
