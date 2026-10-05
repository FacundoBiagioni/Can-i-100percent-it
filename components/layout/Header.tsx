"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import SearchBox from "@/components/search/SearchBox";

// Below the breakpoint where these fit (smaller with the search box beside
// them), the pages outside the homepage move into a menu.
const NAV = [
  { href: "/", label: "Index" },
  { href: "/#recent", label: "Recent" },
  { href: "/#verdicts", label: "Verdicts" },
  { href: "/library", label: "Library" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/about", label: "About" },
];

// The pages outside the homepage, for the phone menu.
const MENU = NAV.filter((item) => item.href !== "/" && !item.href.startsWith("/#"));

export default function Header() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on Escape or a tap outside the menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  return (
    <header ref={menuRef} className="sticky top-0 z-40 border-b border-carbon bg-void">
      <div className="mx-auto flex h-12 max-w-page items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0 text-base font-semibold tracking-tight text-chalk">
          can i 100% it?
        </Link>

        <nav aria-label="Main" className={`hidden items-center gap-6 ${isHome ? "md:flex" : "lg:flex"}`}>
          {NAV.map((item) => {
            // Only the plain route can be "current"; hash links are jumps
            // within the homepage, not places of their own.
            const active = item.href === pathname;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap text-nav font-medium transition-colors ${
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
        <div className="flex min-w-0 items-center gap-2">
          {!isHome && <SearchBox size="sm" autoFocus={false} placeholder="Search another game" />}
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((o) => !o)}
            className={`-mr-2 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-chalk transition-colors hover:text-ash ${isHome ? "md:hidden" : "lg:hidden"}`}
          >
            {menuOpen ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Pages" className={`border-t border-carbon bg-void ${isHome ? "md:hidden" : "lg:hidden"}`}>
          <ul className="mx-auto flex max-w-page flex-col px-4 py-2 sm:px-6">
            {MENU.map((item) => {
              const active = item.href === pathname;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setMenuOpen(false)}
                    className={`flex h-12 items-center justify-between text-heading-sm font-medium transition-colors ${
                      active ? "text-ember" : "text-chalk hover:text-ash"
                    }`}
                  >
                    {item.label}
                    <span aria-hidden className="text-graphite">
                      &rarr;
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
