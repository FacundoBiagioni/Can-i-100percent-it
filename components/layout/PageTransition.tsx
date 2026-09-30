"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Remounts (and re-plays a quick fade-in) on every route change, so
 * navigating between a search result and a game page — or between two
 * games — reads as a soft transition instead of an abrupt cut. */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="flex flex-1 flex-col" style={{ animation: "page-fade-in 0.25s ease-out" }}>
      {children}
    </div>
  );
}
