"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = { appId: number; name: string; image?: string };

const SIZE_CLASSES = {
  lg: "px-5 py-3 text-base rounded-full",
  sm: "px-4 py-2 text-sm rounded-full",
};

export default function SearchBox({
  size = "lg",
  autoFocus = size === "lg",
  placeholder = "Search a Steam game…",
}: {
  size?: "lg" | "sm";
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
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

  return (
    <div ref={containerRef} className={`relative w-full ${size === "lg" ? "max-w-md" : "max-w-xs"}`}>
      <input
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
        placeholder={placeholder}
        className={`w-full border border-zinc-700 bg-zinc-900/80 text-zinc-50 shadow-sm outline-none backdrop-blur transition placeholder:text-zinc-500 focus:border-zinc-500 ${SIZE_CLASSES[size]}`}
        autoFocus={autoFocus}
      />

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-xl">
          {loading && <div className="px-5 py-3 text-sm text-zinc-400">Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="px-5 py-3 text-sm text-zinc-400">No games found</div>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={r.appId}
                onClick={() => goToGame(r.appId)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm text-zinc-50 transition hover:bg-zinc-800"
              >
                {r.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt="" className="h-8 w-16 rounded object-cover" />
                )}
                <span className="line-clamp-1">{r.name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
