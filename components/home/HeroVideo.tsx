"use client";

import { useEffect, useRef, useState } from "react";

const VIDEO_SRC = "/hero.mp4";

/**
 * Ambient full-bleed loop behind the homepage hero. Starts invisible and
 * only fades in once frames are actually playing, so a slow load (or a
 * missing file) just leaves the black void the rest of the page sits on,
 * with no broken-player flash. Never plays under prefers-reduced-motion.
 */
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

    function apply() {
      if (!video) return;
      if (reduce.matches) {
        video.pause();
        setPlaying(false);
      } else {
        // Autoplay can still be refused (e.g. data-saver); the void stays.
        video.play().catch(() => {});
      }
    }

    apply();
    reduce.addEventListener("change", apply);
    return () => reduce.removeEventListener("change", apply);
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <video
        ref={ref}
        src={VIDEO_SRC}
        muted
        loop
        playsInline
        preload="auto"
        onPlaying={() => setPlaying(true)}
        className={`h-full w-full object-cover transition-opacity duration-1000 ${playing ? "opacity-100" : "opacity-0"}`}
      />
      {/* Flat scrim, no gradient: keeps the white type legible over any frame. */}
      <div className="absolute inset-0 bg-void/55" />
    </div>
  );
}
