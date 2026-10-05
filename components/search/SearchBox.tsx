"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search } from "lucide-react";
import { formatPrice } from "@/lib/ui/price";
import { useT } from "@/lib/i18n/client";

type SearchResult = { appId: number; name: string; image?: string; isFree: boolean; priceCents: number | null };

const SIZE_CLASSES = {
  lg: { input: "h-14 pl-12 pr-4 text-base", icon: "left-4 h-5 w-5", wrapper: "max-w-xl" },
  sm: { input: "h-8 pl-8 pr-2 text-sm", icon: "left-2.5 h-3.5 w-3.5", wrapper: "max-w-xs" },
};

export default function SearchBox({
  size = "lg",
  autoFocus = size === "lg",
  placeholder: placeholderProp,
  label,
}: {
  size?: "lg" | "sm";
  autoFocus?: boolean;
  placeholder?: string;
  /** Visible label above the field; without one, the placeholder doubles
   * as the accessible name. */
  label?: string;
}) {
  const t = useT();
  const placeholder = placeholderProp ?? t.search.placeholder;
  const router = useRouter();
  const listboxId = useId();
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const styles = SIZE_CLASSES[size];

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) return;

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setOpen(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function goToGame(appId: number) {
    setOpen(false);
    setQuery("");
    router.push(`/games/${appId}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || loading || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      goToGame(results[activeIndex >= 0 ? activeIndex : 0].appId);
    }
  }

  const expanded = open && (loading || results.length > 0 || query.trim().length >= 2);

  // The big homepage search sits low in the hero; when its results open past
  // the bottom of the screen, scroll just enough to show them whole, without
  // pushing the field under the sticky header.
  const resultCount = results.length;
  useEffect(() => {
    if (!expanded || size !== "lg" || !listRef.current || !containerRef.current) return;
    const overflow = listRef.current.getBoundingClientRect().bottom + 16 - window.innerHeight;
    const roomAbove = containerRef.current.getBoundingClientRect().top - 64;
    const by = Math.min(overflow, roomAbove);
    if (by > 0) {
      const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollBy({ top: by, behavior: smooth ? "smooth" : "auto" });
    }
  }, [expanded, loading, resultCount, size]);

  return (
    <div ref={containerRef} className={`relative w-full ${styles.wrapper}`}>
      {label && (
        <label htmlFor={inputId} className="mb-2 block text-nav text-ash">
          {label}
        </label>
      )}
      <div className="relative">
        <Search aria-hidden className={`pointer-events-none absolute top-1/2 -translate-y-1/2 text-graphite ${styles.icon}`} />
        <input
          id={inputId}
          value={query}
          onChange={(e) => {
            const value = e.target.value;
            setQuery(value);
            if (value.trim().length < 2) {
              setResults([]);
              setOpen(false);
            }
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={label ? undefined : placeholder}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `${listboxId}-${activeIndex}` : undefined}
          autoComplete="off"
          spellCheck={false}
          className={`w-full border border-cinder bg-cinder text-chalk outline-none transition-colors placeholder:text-graphite focus:border-fog focus-visible:outline-none ${styles.input}`}
          autoFocus={autoFocus}
        />
      </div>

      {expanded && (
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          className={`absolute left-0 top-full z-50 mt-px max-h-[min(30rem,70dvh)] overflow-y-auto overscroll-contain border border-carbon bg-void ${size === "sm" ? "w-[min(24rem,calc(100vw-2rem))] max-sm:right-0 max-sm:left-auto" : "right-0"}`}
        >
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex w-full items-center gap-3 border-b border-carbon px-3 py-2.5 last:border-b-0">
                <div className="h-8 w-[70px] shrink-0 animate-pulse bg-cinder" />
                <div className="h-3.5 w-40 animate-pulse bg-cinder" />
              </div>
            ))}
          {!loading && results.length === 0 && <div className="px-3 py-3 text-body text-graphite">{t.search.noResults}</div>}
          {!loading &&
            results.map((r, i) => (
              <button
                key={r.appId}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                tabIndex={-1}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => goToGame(r.appId)}
                className={`flex w-full cursor-pointer items-center gap-3 border-b border-carbon px-3 py-2.5 text-left text-body text-chalk last:border-b-0 ${
                  i === activeIndex ? "bg-obsidian" : ""
                }`}
              >
                {r.image ? (
                  <Image src={r.image} alt="" width={70} height={26} className="h-[26px] w-[70px] shrink-0 object-cover" />
                ) : (
                  <span className="h-[26px] w-[70px] shrink-0 bg-cinder" />
                )}
                <span className="line-clamp-1 flex-1">{r.name}</span>
                <span className="shrink-0 text-caption tabular-nums text-graphite">
                  {r.isFree ? t.search.free : r.priceCents !== null ? formatPrice(r.priceCents) : ""}
                </span>
              </button>
            ))}
          {!loading && results.length > 0 && (
            <div className="sticky bottom-0 border-t border-carbon bg-void px-3 py-2 text-caption text-graphite">{t.priceRegion}</div>
          )}
        </div>
      )}
    </div>
  );
}
