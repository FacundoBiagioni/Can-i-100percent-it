"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchBox from "@/components/search/SearchBox";

export default function Header() {
  const pathname = usePathname();
  // The homepage has its own large, centered search box — showing this
  // one too would put two search bars on screen at once.
  if (pathname === "/") return null;

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between gap-4 border-b border-zinc-800 bg-black/80 px-4 py-3 backdrop-blur-md sm:px-6">
      <Link href="/" className="shrink-0 text-sm font-bold tracking-tight text-zinc-50 sm:text-base">
        Can i 100% it<span className="text-indigo-400">?</span>
      </Link>
      <SearchBox size="sm" autoFocus={false} placeholder="Search another game…" />
    </header>
  );
}
