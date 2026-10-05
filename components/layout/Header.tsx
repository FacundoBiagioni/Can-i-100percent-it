"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchBox from "@/components/search/SearchBox";

// `wide`: only shown from sm up — on a phone the wordmark already links home
// and the four links don't fit next to it.
const NAV = [
  { href: "/", label: "Index", wide: true },
  { href: "/#recent", label: "Recent", wide: true },
  { href: "/#verdicts", label: "Verdicts", wide: true },
  { href: "/library", label: "Library", wide: false },
  { href: "/how-it-works", label: "How it works", wide: false },
  { href: "/about", label: "About", wide: true },
];

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-carbon bg-void">
      <div className="mx-auto flex h-12 max-w-page items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 text-base font-semibold tracking-tight text-chalk">
          can i 100% it?
        </Link>

        <nav aria-label="Main" className={`${isHome ? "flex" : "hidden md:flex"} items-center gap-6`}>
          {NAV.map((item) => {
            // Only the plain route can be "current"; hash links are jumps
            // within the homepage, not places of their own.
            const active = item.href === pathname;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`${item.wide ? "hidden sm:inline" : ""} whitespace-nowrap text-nav font-medium transition-colors ${
                  active ? "text-ember" : "text-chalk hover:text-ash"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* The homepage hero has its own large search box; a second one up
            here would put two search bars on screen at once. */}
        {!isHome && <SearchBox size="sm" autoFocus={false} placeholder="Search another game" />}
      </div>
    </header>
  );
}
