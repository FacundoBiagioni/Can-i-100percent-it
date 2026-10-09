"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import SearchBox from "@/components/search/SearchBox";
import SettingsMenu from "./SettingsMenu";
import Wordmark from "@/components/brand/Wordmark";
import { useT } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

// Below the breakpoint where these fit (smaller with the search box beside
// them), the pages outside the homepage move into a menu.
const NAV: { href: string; label: keyof Dictionary["nav"] }[] = [
  { href: "/", label: "index" },
  { href: "/#recent", label: "recent" },
  { href: "/#verdicts", label: "verdicts" },
  { href: "/lists", label: "lists" },
  { href: "/library", label: "library" },
  { href: "/how-it-works", label: "howItWorks" },
  { href: "/about", label: "about" },
];

// The pages outside the homepage, for the phone menu.
const MENU = NAV.filter((item) => item.href !== "/" && !item.href.startsWith("/#"));

export default function Header() {
  const pathname = usePathname();
  const t = useT();
  const isHome = pathname === "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  // Home only: which section is in view ("#recent", "#verdicts", or "" for
  // the hero), so the nav highlights where you are, not always "Index".
  const [section, setSection] = useState("");

  useEffect(() => {
    if (!isHome) return;
    const targets = ["recent", "verdicts"].map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    const inView = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) inView.add(e.target.id);
          else inView.delete(e.target.id);
        }
        // The lowest section crossing the middle band wins.
        const current = ["verdicts", "recent"].find((id) => inView.has(id));
        setSection(current ? `#${current}` : "");
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [isHome]);

  const isActive = (href: string) => {
    if (!isHome) return href === pathname || (href.length > 1 && pathname.startsWith(`${href}/`));
    return href === "/" ? section === "" : section !== "" && href === `/${section}`;
  };

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
      <div className="mx-auto flex h-12 max-w-page items-center gap-4 px-4 sm:px-6">
        {/* The logo's "%" turns a quarter on hover, like a counter ticking over. */}
        <Link href="/" className="group shrink-0 text-base font-semibold tracking-tight text-chalk">
          <Wordmark spin />
        </Link>

        {/* Home: links sit at the right edge, next to the language switch. Other
            pages: centered between the wordmark and the search box. */}
        <nav aria-label={t.nav.main} className={`hidden items-center gap-6 ${isHome ? "ml-auto md:flex" : "mx-auto lg:flex"}`}>
          {NAV.map((item) => {
            // On home, the section in view; elsewhere, the current route.
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`whitespace-nowrap text-nav font-medium transition-colors ${
                  active ? "text-ember" : "text-chalk hover:text-ash"
                }`}
              >
                {t.nav[item.label]}
              </Link>
            );
          })}
        </nav>

        {/* The homepage hero has its own large search box; a second one up
            here would put two search bars on screen at once. */}
        {/* ml-auto only while the nav is hidden; with it showing, the nav's own
            auto margins place everything. */}
        <div className={`ml-auto flex min-w-0 items-center gap-2 ${isHome ? "md:ml-0" : "lg:ml-0"}`}>
          {!isHome && <SearchBox size="sm" autoFocus={false} placeholder={t.search.placeholderOther} />}
          {/* Pulled out by the icon's own padding so its edge lines up with
              the page edge, when it's the last thing in the row. */}
          <SettingsMenu className={isHome ? "md:-mr-[11px]" : "lg:-mr-[11px]"} />
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
            onClick={() => setMenuOpen((o) => !o)}
            className={`-mr-2 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-chalk transition-colors hover:text-ash ${isHome ? "md:hidden" : "lg:hidden"}`}
          >
            {menuOpen ? <X aria-hidden className="h-5 w-5" /> : <Menu aria-hidden className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label={t.nav.pages} className={`border-t border-carbon bg-void ${isHome ? "md:hidden" : "lg:hidden"}`}>
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
                    {t.nav[item.label]}
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
