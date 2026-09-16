"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = { appId: number; name: string; image?: string };

export default function SearchBox() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    router.push(`/games/${appId}`);
  }

  return (
    <div className="relative w-full max-w-md">
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
        placeholder="Search a Steam game…"
        className="w-full rounded-full border border-zinc-200 bg-white px-5 py-3 text-base text-zinc-900 shadow-sm outline-none transition focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-50"
        autoFocus
      />

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          {loading && (
            <div className="px-5 py-3 text-sm text-zinc-500 dark:text-zinc-400">Searching…</div>
          )}
          {!loading && results.length === 0 && (
            <div className="px-5 py-3 text-sm text-zinc-500 dark:text-zinc-400">No games found</div>
          )}
          {!loading &&
            results.map((r) => (
              <button
                key={r.appId}
                onClick={() => goToGame(r.appId)}
                className="flex w-full items-center gap-3 px-5 py-3 text-left text-sm text-zinc-900 transition hover:bg-zinc-50 dark:text-zinc-50 dark:hover:bg-zinc-800"
              >
                {r.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.image} alt="" className="h-8 w-16 rounded object-cover" />
                )}
                <span>{r.name}</span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
