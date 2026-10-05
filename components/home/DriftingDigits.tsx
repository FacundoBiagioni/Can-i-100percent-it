"use client";

import { useEffect, useRef } from "react";
import { plexMono } from "@/lib/ui/fonts";

const GLYPHS = "100%";
const RGB = "255,77,0";

type Glyph = { x: number; y: number; depth: number; char: string; sway: number; phase: number };

/**
 * The hero's "100%" digits, carried on below it: sparse, faint glyphs that
 * drift upward and shift with scroll (nearer ones faster), so the page past
 * the hero isn't flat black. A viewport-sized canvas kept in view with
 * position: sticky, so it costs the same however long the page is. Runs
 * only while on screen; with reduced motion it draws one still frame.
 */
export default function DriftingDigits() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let glyphs: Glyph[] = [];
    let w = 0;
    let h = 0;
    let raf = 0;
    let visible = false;
    let last = performance.now();
    let t = 0;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.min(90, Math.round((w * h) / 16000));
      glyphs = Array.from({ length: count }, () => ({
        x: Math.random(),
        y: Math.random(),
        depth: 0.25 + Math.random() * 0.75,
        char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        sway: 4 + Math.random() * 10,
        phase: Math.random() * Math.PI * 2,
      }));
    };

    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const scroll = reduced ? 0 : window.scrollY;
      const span = h + 60;
      for (const g of glyphs) {
        const size = 9 + g.depth * 13;
        // Drift up over time and with scroll; nearer glyphs move more.
        const raw = g.y * span - t * (5 + g.depth * 10) - scroll * g.depth * 0.18;
        const y = ((raw % span) + span) % span - 30;
        const x = g.x * w + Math.sin(t * 0.25 + g.phase) * g.sway;
        // Fade in from the edges so glyphs don't pop at the top or bottom.
        const edge = Math.min(1, y / 120, (h - y) / 120);
        const alpha = Math.max(0, edge) * (0.05 + g.depth * 0.13);
        ctx.font = `600 ${size}px ${plexMono.style.fontFamily}`;
        ctx.fillStyle = `rgba(${RGB},${alpha})`;
        ctx.fillText(g.char, x, y);
      }
    };

    const frame = (now: number) => {
      t += Math.min(0.05, (now - last) / 1000);
      last = now;
      draw();
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (reduced || raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    resize();
    draw();
    const ro = new ResizeObserver(() => {
      resize();
      draw();
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else stop();
    });
    io.observe(canvas.parentElement ?? canvas);
    const onVisibility = () => (document.hidden ? stop() : visible && start());
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      <canvas ref={ref} className="sticky top-0 block h-[100dvh] w-full" />
    </div>
  );
}
