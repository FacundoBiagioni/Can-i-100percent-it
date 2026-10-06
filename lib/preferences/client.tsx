"use client";

import { createContext, useContext, useState } from "react";
import { MOTION_COOKIE, MOTION_EVENT, SPOILERS_COOKIE, type Preferences } from "./config";

type PreferencesContext = Preferences & {
  setReduceMotion: (value: boolean) => void;
  setHideSpoilers: (value: boolean) => void;
};

const Context = createContext<PreferencesContext | null>(null);

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

function applyMotion(reduce: boolean) {
  if (reduce) document.documentElement.dataset.motion = "off";
  else delete document.documentElement.dataset.motion;
  window.dispatchEvent(new Event(MOTION_EVENT));
}

/** Both preferences apply on the spot: no server round trip is needed, the
 * cookie just makes the next server render match. */
export function PreferencesProvider({ initial, children }: { initial: Preferences; children: React.ReactNode }) {
  const [prefs, setPrefs] = useState(initial);
  const value: PreferencesContext = {
    ...prefs,
    setReduceMotion: (reduceMotion) => {
      writeCookie(MOTION_COOKIE, reduceMotion ? "off" : "on");
      applyMotion(reduceMotion);
      setPrefs((p) => ({ ...p, reduceMotion }));
    },
    setHideSpoilers: (hideSpoilers) => {
      writeCookie(SPOILERS_COOKIE, hideSpoilers ? "hide" : "show");
      setPrefs((p) => ({ ...p, hideSpoilers }));
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePreferences() {
  const ctx = useContext(Context);
  if (!ctx) throw new Error("usePreferences outside PreferencesProvider");
  return ctx;
}
