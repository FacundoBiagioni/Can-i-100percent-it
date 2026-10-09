"use client";

import { createContext, useContext } from "react";
import { usePreferences } from "@/lib/preferences/client";
import { useT } from "@/lib/i18n/client";
import { maskHiddenNames } from "@/lib/spoilers";

const HiddenNamesContext = createContext<string[]>([]);

/** The current game's hidden achievement names, for everything inside a
 * game's result (verdict tooltip, required DLC list). */
export function HiddenNamesProvider({ names, children }: { names: string[]; children: React.ReactNode }) {
  return <HiddenNamesContext.Provider value={names}>{children}</HiddenNamesContext.Provider>;
}

/** Helpers that respect "Hide spoilers": whether a name is a covered
 * spoiler, and a text with hidden names swapped for a placeholder. */
export function useSpoilers() {
  const names = useContext(HiddenNamesContext);
  const { hideSpoilers } = usePreferences();
  const t = useT();
  const active = hideSpoilers && names.length > 0;
  return {
    active,
    isHidden: (name: string) => active && names.includes(name),
    mask: (text: string) => (active ? maskHiddenNames(text, names, t.achievements.hiddenTitle) : text),
  };
}
